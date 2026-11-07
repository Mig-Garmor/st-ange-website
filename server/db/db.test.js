import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { migrate } from "./migrate.js";
import { getTestSql } from "./testDb.js";
import { createDb } from "./index.js";
import { chicagoDay, isAvailable, resumeSql } from "../../chat/server/limits.js";

describe.skipIf(!process.env.TEST_DATABASE_URL)("data access", () => {
  let sql, db;
  const site = `test-${randomUUID()}`;
  const day = "2026-01-15";

  beforeAll(async () => {
    sql = getTestSql();
    await migrate(sql);
    db = createDb(sql);
  });

  const newConversation = (overrides = {}) =>
    db.ensureConversation({ site, id: randomUUID(), visitorId: "v1", ipHash: randomUUID(), ...overrides });

  it("upsertLead in parallel for the same phone makes one row", async () => {
    const phones = ["8325550101", "8325550101", "8325550101", "8325550101", "8325550101"];
    const vehicles = ["Civic", null, "Accord", null, null];
    await Promise.all(phones.map((phone, i) => db.upsertLead({ site, name: `N${i}`, phone, vehicle: vehicles[i] })));
    const rows = await sql`select vehicle from leads where site = ${site} and phone = '8325550101'`;
    expect(rows).toHaveLength(1);
    expect(["Civic", "Accord"]).toContain(rows[0].vehicle);
  });

  it("upsertLead matches on email when phone is null", async () => {
    const a = await db.upsertLead({ site, email: "Mix@Example.com", phone: null });
    const b = await db.upsertLead({ site, email: "mix@example.com", phone: null, name: "Mix" });
    expect(b.id).toBe(a.id);
  });

  it("recordRequest with the same idempotency key twice returns duplicate true and one row", async () => {
    const input = { site, idempotencyKey: randomUUID(), source: "contact_form", message: "hi" };
    const first = await db.recordRequest(input);
    const second = await db.recordRequest(input);
    expect(first.duplicate).toBe(false);
    expect(second).toMatchObject({ id: first.id, duplicate: true });
    const rows = await sql`select id from requests where idempotency_key = ${input.idempotencyKey}`;
    expect(rows).toHaveLength(1);
    await db.setRequestEmailStatus(first.id, { status: "sent" });
    expect((await db.recordRequest(input)).emailStatus).toBe("sent");
  });

  it("pauseChat called 5 times in parallel returns true exactly once", async () => {
    const s = `${site}-pause`;
    const results = await Promise.all(Array.from({ length: 5 }, () => db.pauseChat(s, "cap")));
    expect(results.filter(Boolean)).toHaveLength(1);
    expect((await db.getChatState(s)).status).toBe("paused");
  });

  it("addUsage in parallel sums every cost", async () => {
    const s = `${site}-usage`;
    await Promise.all(Array.from({ length: 10 }, () => db.addUsage({ site: s, day, inputTokens: 1, costEur: 0.01 })));
    const usage = await db.getUsage(s, day);
    expect(usage.costEur).toBeCloseTo(0.1, 4);
    expect(usage.calls).toBe(10);
  });

  it("getConversation returns null for an unknown id and never inserts", async () => {
    const id = randomUUID();
    expect(await db.getConversation(id)).toBeNull();
    expect(await sql`select id from conversations where id = ${id}`).toHaveLength(0);
  });

  it("getConversation returns the verification and message count", async () => {
    const verified = await newConversation({ verified: true });
    await db.saveMessage({ site, conversationId: verified.id, role: "user", content: "q" });
    const found = await db.getConversation(verified.id);
    expect(found).toMatchObject({ id: verified.id, messageCount: 1 });
    expect(found.verifiedAt).toBeInstanceOf(Date);
    expect((await db.getConversation((await newConversation()).id)).verifiedAt).toBeNull();
  });

  it("saveMessage counts only user messages", async () => {
    const conv = await newConversation();
    await db.saveMessage({ site, conversationId: conv.id, role: "user", content: "q" });
    await db.saveMessage({ site, conversationId: conv.id, role: "assistant", content: "a" });
    expect((await db.ensureConversation({ site, id: conv.id, visitorId: "v1" })).messageCount).toBe(1);
    expect((await db.getMessages(conv.id)).map((m) => m.role)).toEqual(["user", "assistant"]);
  });

  it("claimForInsights skips conversations active in the last hour and does not return the same conversation to a second claim", async () => {
    const s = `${site}-claim`;
    const idle = await newConversation({ site: s });
    const active = await newConversation({ site: s });
    for (const conv of [idle, active]) await db.saveMessage({ site: s, conversationId: conv.id, role: "user", content: "hello" });
    await sql`update conversations set last_message_at = now() - interval '2 hours' where id = ${idle.id}`;
    const first = await db.claimForInsights(s, 10);
    expect(first.map((c) => c.id)).toEqual([idle.id]);
    expect(first[0].transcript).toContain("user: hello");
    expect(await db.claimForInsights(s, 10)).toEqual([]);
    await db.saveInsights(idle.id, { summary: "s", services: ["brakes"], intent: "quote", unanswered: [], outcome: "lead" });
    const [row] = await sql`select insights_at, services from conversations where id = ${idle.id}`;
    expect(row.insights_at).not.toBeNull();
    expect(row.services).toEqual(["brakes"]);
  });

  it("claimForInsights flags a conversation whose request email was sent", async () => {
    const s = `${site}-claim-sent`;
    const [sent, pending] = [await newConversation({ site: s }), await newConversation({ site: s })];
    for (const conv of [sent, pending]) {
      await db.saveMessage({ site: s, conversationId: conv.id, role: "user", content: "brakes" });
      await db.recordRequest({ site: s, idempotencyKey: `${conv.id}:k`, source: "chat", conversationId: conv.id });
    }
    await db.setRequestEmailStatus((await sql`select id from requests where conversation_id = ${sent.id}`)[0].id, { status: "sent" });
    await sql`update conversations set last_message_at = now() - interval '2 hours' where site = ${s}`;
    const claimed = Object.fromEntries((await db.claimForInsights(s, 10)).map((c) => [c.id, c.requestSent]));
    expect(claimed).toEqual({ [sent.id]: true, [pending.id]: false });
  });

  it("getChatState creates an active row", async () => {
    expect(await db.getChatState(`${site}-fresh`)).toMatchObject({ status: "active", pausedAt: null });
  });

  it("getChatState returns no resume for a fresh site", async () => {
    expect(await db.getChatState(`${site}-noresume`)).toMatchObject({ resumedAt: null, resumeCostEur: 0 });
  });

  it("the documented resume SQL reactivates and stores today's spend, so the chat is available again", async () => {
    const s = `${site}-resume`;
    const settings = { site: s, timeZone: "America/Chicago", dailyCapEur: 5 };
    const today = chicagoDay(new Date(), "America/Chicago");
    await db.addUsage({ site: s, day: today, costEur: 5.25 });
    await db.pauseChat(s, "daily cap reached");
    expect(await isAvailable({ db, settings, now: new Date() })).toBe(false);

    await sql.query(resumeSql(s, "America/Chicago"));
    const state = await db.getChatState(s);
    expect(state).toMatchObject({ status: "active", resumeCostEur: 5.25 });
    expect(state.resumedAt).not.toBeNull();
    expect(await isAvailable({ db, settings, now: new Date() })).toBe(true);

    await db.addUsage({ site: s, day: today, costEur: 5 });
    expect(await isAvailable({ db, settings, now: new Date() })).toBe(false);
  });

  it("purgeExpired removes chats past 18 months and leads past 3 years, keeping anything newer or still referenced", async () => {
    const s = `${site}-purge`;
    const [oldChat, newChat] = [await newConversation({ site: s }), await newConversation({ site: s })];
    for (const c of [oldChat, newChat]) await db.saveMessage({ site: s, conversationId: c.id, role: "user", content: "hi" });
    await sql`update conversations set last_message_at = now() - interval '19 months' where id = ${oldChat.id}`;
    const [oldLead] = await sql`insert into leads (site, name, phone, updated_at) values (${s}, 'Old', '2815550001', now() - interval '4 years') returning id`;
    const [keptLead] = await sql`insert into leads (site, name, phone, updated_at) values (${s}, 'Kept', '2815550002', now() - interval '4 years') returning id`;
    await db.recordRequest({ site: s, idempotencyKey: randomUUID(), source: "chat", leadId: keptLead.id, conversationId: oldChat.id });
    expect(await db.purgeExpired({ site: s, chatMonths: 18, leadYears: 3 })).toEqual({ chats: 1, leads: 1 });
    expect((await sql`select id from conversations where site = ${s}`).map((r) => r.id)).toEqual([newChat.id]);
    expect(await sql`select 1 from messages where conversation_id = ${oldChat.id}`).toEqual([]);
    expect((await sql`select name from leads where site = ${s}`).map((r) => r.name)).toEqual(["Kept"]);
    const [request] = await sql`select conversation_id from requests where site = ${s}`;
    expect(request.conversation_id).toBeNull();
    void oldLead;
  });

  it("recordRequest stores the consent wording with the time it was given", async () => {
    const key = randomUUID();
    await db.recordRequest({ site, idempotencyKey: key, source: "chat", consentText: "May call or text me." });
    await db.recordRequest({ site, idempotencyKey: randomUUID(), source: "contact_form" });
    const [withConsent] = await sql`select consent_text, consent_at from requests where idempotency_key = ${key}`;
    expect(withConsent.consent_text).toBe("May call or text me.");
    expect(withConsent.consent_at).toBeInstanceOf(Date);
  });

  it("claimRequestSlot hands out exactly 3 slots to 6 parallel new keys, and a known key takes none", async () => {
    const conv = await newConversation();
    const keys = Array.from({ length: 6 }, () => randomUUID());
    const granted = await Promise.all(keys.map((k) => db.claimRequestSlot(conv.id, k, 3)));
    expect(granted.filter(Boolean)).toHaveLength(3);
    const known = randomUUID();
    await db.recordRequest({ site, idempotencyKey: known, source: "chat", conversationId: conv.id });
    expect(await db.claimRequestSlot(conv.id, known, 3)).toBe(true);
    expect(await db.claimRequestSlot(conv.id, randomUUID(), 3)).toBe(false);
  });

  it("countAttempt allows exactly max attempts, even in parallel", async () => {
    const conv = await newConversation();
    const results = await Promise.all(Array.from({ length: 8 }, () => db.countAttempt(conv.id, 5)));
    expect(results.filter(Boolean)).toHaveLength(5);
    expect(await db.countAttempt(conv.id, 5)).toBe(false);
  });

  it("forgetIpHashes clears hashes older than the given days and keeps recent ones", async () => {
    const [old, recent] = [await newConversation({ ipHash: "h-old" }), await newConversation({ ipHash: "h-new" })];
    await sql`update conversations set created_at = now() - interval '8 days' where id = ${old.id}`;
    await db.forgetIpHashes(7);
    const rows = await sql`select id, ip_hash from conversations where id in (${old.id}, ${recent.id})`;
    expect(Object.fromEntries(rows.map((r) => [r.id, r.ip_hash]))).toEqual({ [old.id]: null, [recent.id]: "h-new" });
  });

  it("carryOverSource returns the same visitor's chat from the last 24 hours, and nothing for anyone else", async () => {
    const prev = await newConversation({ visitorId: "v-carry" });
    for (const content of ["my car pulls left", "it is a 2018 Camry"]) await db.saveMessage({ site, conversationId: prev.id, role: "user", content });
    await db.saveMessage({ site, conversationId: prev.id, role: "assistant", content: "We can check that." });
    const found = await db.carryOverSource({ site, previousId: prev.id, visitorId: "v-carry" });
    expect(found).toEqual({
      summary: null,
      lead: { name: null, phone: null, email: null, vehicle: null },
      userMessages: ["my car pulls left", "it is a 2018 Camry"],
    });
    expect(await db.carryOverSource({ site, previousId: prev.id, visitorId: "someone-else" })).toBeNull();
    await sql`update conversations set last_message_at = now() - interval '25 hours' where id = ${prev.id}`;
    expect(await db.carryOverSource({ site, previousId: prev.id, visitorId: "v-carry" })).toBeNull();
  });

  it("ensureConversation stores the carried context and getConversation returns it", async () => {
    const prev = await newConversation({ visitorId: "v-store" });
    const details = { name: "Dana", phone: "2815550166", email: null, vehicle: "2019 Civic" };
    const next = await db.ensureConversation({ site, id: randomUUID(), visitorId: "v-store", verified: true, previousId: prev.id, carryOver: "brakes on a Civic", carryDetails: details });
    expect(next.carryOver).toBe("brakes on a Civic");
    expect(next.carryDetails).toEqual(details);
    expect((await db.getConversation(next.id)).carryOver).toBe("brakes on a Civic");
  });

  it("formRequestsLastHour counts one IP's recent form requests, not chat ones", async () => {
    const ipHash = randomUUID();
    for (const source of ["contact_form", "quote_form", "chat"]) {
      await db.recordRequest({ site, idempotencyKey: randomUUID(), source, ipHash });
    }
    await db.recordRequest({ site, idempotencyKey: randomUUID(), source: "contact_form", ipHash: randomUUID() });
    expect(await db.formRequestsLastHour(ipHash)).toBe(2);
  });

  it("activePlaybooks returns only active versions", async () => {
    const s = `${site}-pb`;
    await sql`insert into playbooks (site, intent, version, content, active) values
      (${s}, 'quote', 1, 'old', false), (${s}, 'quote', 2, 'new', true)`;
    expect(await db.activePlaybooks(s)).toEqual([{ intent: "quote", content: "new" }]);
  });

  it("dayStats counts user messages and distinct visitors for the Chicago date", async () => {
    const s = `${site}-stats`;
    const a = await newConversation({ site: s, visitorId: "a" });
    const b = await newConversation({ site: s, visitorId: "b" });
    for (const conv of [a, b]) await db.saveMessage({ site: s, conversationId: conv.id, role: "user", content: "x" });
    const c = await newConversation({ site: s, visitorId: "c" });
    await db.saveMessage({ site: s, conversationId: c.id, role: "user", content: "outside" });
    await sql`update messages set created_at = '2026-01-16 03:00:00+00' where site = ${s} and content = 'x'`;
    await sql`update messages set created_at = '2026-01-16 07:00:00+00' where site = ${s} and content = 'outside'`;
    expect(await db.dayStats(s, day, "America/Chicago")).toEqual({ messages: 2, visitors: 2 });
  });

  it("conversationForHub returns the chat with its lead, insights and messages in order, and null for an unknown id", async () => {
    const lead = await db.upsertLead({ site, name: "Test Hub", phone: "8325550199", email: "owner@example.com" });
    const chat = await newConversation({ pageUrl: "/services/brake-repair" });
    await db.linkLead(chat.id, lead.id);
    await db.saveMessage({ site, conversationId: chat.id, role: "user", content: "first" });
    await db.saveMessage({ site, conversationId: chat.id, role: "assistant", content: "second" });
    await db.saveInsights(chat.id, { summary: "S", services: ["brake-repair"], intent: "quote", unanswered: [], outcome: "info_only" });

    const out = await db.conversationForHub(chat.id);
    expect(out).toMatchObject({
      id: chat.id, pagePath: "/services/brake-repair",
      lead: { name: "Test Hub", phone: "8325550199", email: "owner@example.com" },
      insights: { summary: "S", services: ["brake-repair"], intent: "quote", unanswered: [], outcome: "info_only" },
    });
    expect(out.startedAt).toBeInstanceOf(Date);
    expect(out.messages.map((m) => m.content)).toEqual(["first", "second"]);
    expect(out.messages[0].at).toBeInstanceOf(Date);
    expect(await db.conversationForHub(randomUUID())).toBeNull();
  });
});
