import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { migrate } from "../../server/db/migrate.js";
import { getTestSql } from "../../server/db/testDb.js";
import { createDb } from "../../server/db/index.js";
import { createRequestService } from "../../server/requests.js";
import { handleSendEmail } from "../../server/sendEmailHandler.js";
import { createChatHandler } from "./createChatHandler.js";
import { createRequestHandler } from "./createRequestHandler.js";
import { createInsightsJob } from "./createInsightsJob.js";
import { isAvailable, recordUsage } from "./limits.js";

const MODEL = "fake-model";
const NOW = new Date("2026-11-04T18:00:00Z");

describe.skipIf(!process.env.TEST_DATABASE_URL)("chat end to end against a real database", () => {
  let sql, db;

  beforeAll(async () => {
    sql = getTestSql();
    await migrate(sql);
    db = createDb(sql);
  });

  const makeSettings = (site, over = {}) => ({
    site,
    timeZone: "America/Chicago",
    phoneDisplay: "555-0100",
    knowledge: "Knowledge.",
    featured: "Featured.",
    services: [{ slug: "brakes", name: "Brakes" }],
    limits: { maxChars: 500, maxUserMessages: 20, perHour: 40 },
    maxOutputTokens: 150,
    dailyCapEur: 5,
    models: { [MODEL]: { inputUsd: 1, cachedInputUsd: 0.1, outputUsd: 2 } },
    eurPerUsd: 0.9,
    hours: [],
    copy: { offline: "Offline.", limit: "Limit.", unavailable: "Unavailable." },
    ...over,
  });

  const fakeEmail = () => ({ send: vi.fn(async () => {}) });
  const usage = { inputTokens: 1000, cachedInputTokens: 0, outputTokens: 100 };
  const fakeAi = (reply = "Happy to help with your brakes.") => ({
    streamReply: vi.fn(async ({ onFinish }) => {
      await onFinish({ text: reply, toolCall: null, usage });
      return new Response("ok");
    }),
    generateInsights: vi.fn(async () => ({
      object: { summary: "Asked about brakes.", services: ["brakes"], intent: "quote", unanswered: ["Do you do tint?"], outcome: "request_sent" },
      usage,
    })),
  });

  const chatRequest = (body) =>
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.9" },
      body: JSON.stringify(body),
    });
  const jsonRequest = (body) =>
    new Request("http://localhost/api/chat-request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

  it("runs the chat, request, form, insight and cap paths", async () => {
    const site = `test-${randomUUID()}`;
    const settings = makeSettings(site);
    const email = fakeEmail();
    const ai = fakeAi();
    const turnstile = { verify: vi.fn(async () => true) };
    const requests = createRequestService({ db, email, site });
    const handleChat = createChatHandler(settings, { db, ai, email, turnstile, ipSalt: "salt", model: MODEL, now: () => NOW });
    const handleRequest = createRequestHandler(settings, { db, requests });

    const conversationId = randomUUID();
    const res = await handleChat(
      chatRequest({
        id: conversationId,
        visitorId: "visitor-1",
        turnstileToken: "token",
        messages: [{ id: "u1", role: "user", parts: [{ type: "text", text: "My brakes squeal" }] }],
      }),
    );
    expect(res.status).toBe(200);
    const conversation = await db.getConversation(conversationId);
    expect(conversation.verifiedAt).toBeInstanceOf(Date);
    expect(conversation.messageCount).toBe(1);
    expect((await db.getMessages(conversationId)).map((m) => [m.role, m.content])).toEqual([
      ["user", "My brakes squeal"],
      ["assistant", "Happy to help with your brakes."],
    ]);
    const today = await db.getUsage(site, "2026-11-04");
    expect(today.calls).toBe(1);
    expect(today.costEur).toBeGreaterThan(0);

    const idempotencyKey = randomUUID();
    const card = { conversationId, idempotencyKey, name: "Jane Driver", phone: "+1 (832) 555-0142", vehicle: "2015 Honda Civic", service: "brakes", notes: "Squealing when braking" };
    expect(await (await handleRequest(jsonRequest(card))).json()).toEqual({ status: "sent" });
    expect(await (await handleRequest(jsonRequest(card))).json()).toEqual({ status: "sent" });

    const [request] = await sql`select * from requests where site = ${site} and source = 'chat'`;
    expect(request).toMatchObject({ email_status: "sent", service: "brakes", conversation_id: conversationId });
    const leads = await sql`select id, phone from leads where site = ${site}`;
    expect(leads).toHaveLength(1);
    expect(leads[0].phone).toBe("8325550142");
    const [linked] = await sql`select lead_id from conversations where id = ${conversationId}`;
    expect(linked.lead_id).toBe(leads[0].id);
    expect(email.send).toHaveBeenCalledTimes(1);
    const sent = email.send.mock.calls[0][0];
    expect(sent.subject).toBe("[Chat] Brakes request from Jane Driver");
    expect(sent.text).toContain("Customer: My brakes squeal");
    expect(sent.text).toContain("Assistant: Happy to help with your brakes.");

    const formEmail = fakeEmail();
    const formRequests = createRequestService({ db, email: formEmail, site });
    const form = await handleSendEmail(
      { data: { source: "quote_form", name: "Sam Quote", phone: "832.555.0199", email: "sam@example.com", vehicle: "2012 Ford F-150", service: "car-alignment", message: "Need a quote", idempotencyKey: randomUUID() } },
      { requests: formRequests },
    );
    expect(form.status).toBe(200);
    expect(formEmail.send).toHaveBeenCalledTimes(1);
    const [formRow] = await sql`select source, service, email_status from requests where site = ${site} and source = 'quote_form'`;
    expect(formRow).toMatchObject({ source: "quote_form", service: "car-alignment", email_status: "sent" });

    await sql`update conversations set last_message_at = now() - interval '2 hours' where id = ${conversationId}`;
    const job = createInsightsJob(settings, { db, ai, email, model: MODEL, cronSecret: "s3cret", now: () => NOW });
    const jobRes = await job(new Request("http://localhost/api/cron/chat-insights", { headers: { authorization: "Bearer s3cret" } }));
    expect(await jobRes.json()).toEqual({ processed: 1, failed: 0 });
    const [insight] = await sql`select summary, services, intent, unanswered, outcome, insights_at from conversations where id = ${conversationId}`;
    expect(insight).toMatchObject({ summary: "Asked about brakes.", services: ["brakes"], intent: "quote", unanswered: ["Do you do tint?"], outcome: "request_sent" });
    expect(insight.insights_at).not.toBeNull();
  }, 60_000);

  it("pauses the chat once and alerts once when usage crosses the cap", async () => {
    const site = `test-${randomUUID()}`;
    const settings = makeSettings(site, { dailyCapEur: 0.0001 });
    const email = fakeEmail();
    expect(await isAvailable({ db, settings, now: NOW })).toBe(true);

    await Promise.all([1, 2, 3].map(() => recordUsage({ db, email, settings, model: MODEL, usage, now: NOW })));

    expect((await db.getChatState(site)).status).toBe("paused");
    expect(email.send).toHaveBeenCalledTimes(1);
    expect(email.send.mock.calls[0][0].subject).toBe("Chat paused: daily cap reached");
    expect(await isAvailable({ db, settings, now: NOW })).toBe(false);
  }, 30_000);
});
