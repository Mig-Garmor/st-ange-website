import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { migrate } from "./migrate.js";
import { getTestSql } from "./testDb.js";
import { createDb } from "./index.js";

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

  it("getChatState creates an active row", async () => {
    expect(await db.getChatState(`${site}-fresh`)).toMatchObject({ status: "active", pausedAt: null });
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
    expect(await db.dayStats(s, day)).toEqual({ messages: 2, visitors: 2 });
  });
});
