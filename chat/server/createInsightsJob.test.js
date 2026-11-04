import { describe, it, expect, vi } from "vitest";
import { createInsightsJob, insightsSchema } from "./createInsightsJob.js";

const settings = {
  site: "test-site",
  timeZone: "America/Chicago",
  dailyCapEur: 5,
  eurPerUsd: 0.9,
  knowledge: "Open Monday to Friday.",
  services: [{ slug: "car-alignment", name: "Car Alignment" }],
  models: { m: { inputUsd: 1, cachedInputUsd: 0.1, outputUsd: 2 } },
};

const insight = { summary: "Asked about alignment.", services: ["car-alignment"], intent: "question", unanswered: [], outcome: "info_only" };
const usage = { inputTokens: 100, cachedInputTokens: 0, outputTokens: 20 };

const fakeDb = (over = {}) => ({
  getChatState: vi.fn(async () => ({ status: "active" })),
  getUsage: vi.fn(async () => ({ costEur: 0 })),
  addUsage: vi.fn(async () => ({ costEur: 0.01 })),
  claimForInsights: vi.fn(async () => [
    { id: "a", transcript: "user: hi" },
    { id: "b", transcript: "user: hello" },
  ]),
  saveInsights: vi.fn(async () => {}),
  ...over,
});

const req = (auth) => new Request("http://localhost/api/cron/chat-insights", { headers: auth ? { authorization: auth } : {} });
const job = (db, ai, over = {}) =>
  createInsightsJob(settings, { db, ai, email: { send: vi.fn() }, model: "m", cronSecret: "s3cret", now: () => new Date("2026-11-04T12:00:00Z"), ...over });

describe("createInsightsJob", () => {
  it("401 without the secret", async () => {
    const db = fakeDb();
    const ai = { generateInsights: vi.fn() };
    expect((await job(db, ai)(req())).status).toBe(401);
    expect((await job(db, ai)(req("Bearer nope"))).status).toBe(401);
    expect((await job(db, ai, { cronSecret: undefined })(req("Bearer undefined"))).status).toBe(401);
    expect(db.claimForInsights).not.toHaveBeenCalled();
  });

  it("skipped when offline", async () => {
    const db = fakeDb({ getChatState: async () => ({ status: "paused" }) });
    const res = await job(db, { generateInsights: vi.fn() })(req("Bearer s3cret"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ skipped: "offline" });
    expect(db.claimForInsights).not.toHaveBeenCalled();
  });

  it("saves insights for each claimed conversation", async () => {
    const db = fakeDb();
    const ai = { generateInsights: vi.fn(async () => ({ object: insight, usage })) };
    const res = await job(db, ai)(req("Bearer s3cret"));
    expect(await res.json()).toEqual({ processed: 2, failed: 0 });
    expect(db.claimForInsights).toHaveBeenCalledWith("test-site", 50);
    expect(db.saveInsights).toHaveBeenCalledWith("a", insight);
    expect(db.saveInsights).toHaveBeenCalledWith("b", insight);
    expect(db.addUsage).toHaveBeenCalledTimes(2);
    expect(ai.generateInsights.mock.calls[0][0].transcript).toBe("user: hi");
    expect(ai.generateInsights.mock.calls[0][0].system).toContain("Open Monday to Friday.");
  });

  it("one failure does not stop the others", async () => {
    const db = fakeDb();
    const ai = {
      generateInsights: vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce({ object: insight, usage }),
    };
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await job(db, ai)(req("Bearer s3cret"));
    expect(await res.json()).toEqual({ processed: 1, failed: 1 });
    expect(db.saveInsights).toHaveBeenCalledTimes(1);
    expect(db.saveInsights).toHaveBeenCalledWith("b", insight);
  });

  it("stops early when the chat goes offline mid-run", async () => {
    const db = fakeDb({ getChatState: vi.fn().mockResolvedValueOnce({ status: "active" }).mockResolvedValue({ status: "paused" }) });
    const ai = { generateInsights: vi.fn(async () => ({ object: insight, usage })) };
    const res = await job(db, ai)(req("Bearer s3cret"));
    expect(await res.json()).toEqual({ processed: 0, failed: 0 });
    expect(ai.generateInsights).not.toHaveBeenCalled();
  });

  it("the schema rejects an unknown service slug", () => {
    const schema = insightsSchema(["car-alignment"]);
    expect(schema.safeParse({ ...insight, services: ["oil-change"] }).success).toBe(false);
    expect(schema.safeParse(insight).success).toBe(true);
    expect(schema.safeParse({ ...insight, summary: "x".repeat(301) }).success).toBe(false);
  });

  it("500 and no claim or AI call when the model has no valid price", async () => {
    for (const model of [undefined, "unpriced"]) {
      const db = fakeDb();
      const ai = { generateInsights: vi.fn() };
      vi.spyOn(console, "error").mockImplementation(() => {});
      const res = await job(db, ai, { model })(req("Bearer s3cret"));
      expect(res.status).toBe(500);
      expect((await res.json()).error).toContain("No price for model");
      expect(db.claimForInsights).not.toHaveBeenCalled();
      expect(ai.generateInsights).not.toHaveBeenCalled();
    }
  });

  it("records usage before saving insights, even when the save fails", async () => {
    const order = [];
    const db = fakeDb({
      addUsage: vi.fn(async () => (order.push("usage"), { costEur: 0.01 })),
      saveInsights: vi.fn(async () => {
        order.push("save");
        throw new Error("db write failed");
      }),
    });
    const ai = { generateInsights: vi.fn(async () => ({ object: insight, usage })) };
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await job(db, ai)(req("Bearer s3cret"));
    expect(await res.json()).toEqual({ processed: 0, failed: 2 });
    expect(order).toEqual(["usage", "save", "usage", "save"]);
  });

  it("a schema failure records the billed usage and marks the conversation abandoned so it is not retried", async () => {
    const db = fakeDb();
    const ai = { generateInsights: vi.fn(async () => ({ object: null, usage })) };
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await job(db, ai)(req("Bearer s3cret"));
    expect(await res.json()).toEqual({ processed: 0, failed: 2 });
    expect(db.addUsage).toHaveBeenCalledTimes(2);
    expect(db.saveInsights).toHaveBeenCalledWith("a", { outcome: "abandoned" });
    expect(db.saveInsights).toHaveBeenCalledWith("b", { outcome: "abandoned" });
  });

  it("with a provider that reports cost, an unpriced model runs and records the reported cost", async () => {
    const db = fakeDb({ claimForInsights: vi.fn(async () => [{ id: "a", transcript: "user: hi" }]) });
    const ai = { generateInsights: vi.fn(async () => ({ object: insight, usage: { ...usage, costUsd: 0.002 } })) };
    const reporting = { ...settings, providerReportsCost: true };
    const res = await createInsightsJob(reporting, {
      db, ai, email: { send: vi.fn() }, model: "openai/new-model", cronSecret: "s3cret", now: () => new Date("2026-11-04T12:00:00Z"),
    })(req("Bearer s3cret"));
    expect(await res.json()).toEqual({ processed: 1, failed: 0 });
    expect(db.addUsage.mock.calls[0][0].costEur).toBeCloseTo(0.002 * 0.9, 12);
  });

  it("an unpriced call without a reported cost pauses the chat and stops the batch", async () => {
    let paused = false;
    const db = fakeDb({
      getChatState: vi.fn(async () => ({ status: paused ? "paused" : "active" })),
      pauseChat: vi.fn(async () => ((paused = true), true)),
      dayStats: vi.fn(async () => ({ messages: 1, visitors: 1 })),
    });
    const ai = { generateInsights: vi.fn(async () => ({ object: insight, usage })) };
    const email = { send: vi.fn(async () => {}) };
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await createInsightsJob({ ...settings, providerReportsCost: true }, {
      db, ai, email, model: "openai/new-model", cronSecret: "s3cret", now: () => new Date("2026-11-04T12:00:00Z"),
    })(req("Bearer s3cret"));
    expect(await res.json()).toEqual({ processed: 1, failed: 0 });
    expect(ai.generateInsights).toHaveBeenCalledTimes(1);
    expect(db.pauseChat).toHaveBeenCalledWith("test-site", "unpriced call without a reported cost");
    expect(email.send).toHaveBeenCalledTimes(1);
  });
});
