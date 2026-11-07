import { describe, it, expect, vi } from "vitest";
import { costEur } from "./cost.js";
import { assertPriced, chicagoDay, isAvailable, checkLimits, recordUsage } from "./limits.js";

const settings = {
  site: "st-ange",
  timeZone: "America/Chicago",
  limits: { maxChars: 500, maxUserMessages: 20, perHour: 40 },
  dailyCapEur: 5,
  models: { m: { inputUsd: 1, cachedInputUsd: 0.5, outputUsd: 2 } },
  eurPerUsd: 0.5,
};

const fakeDb = (over = {}) => ({
  getChatState: vi.fn(async () => ({ status: "active" })),
  getUsage: vi.fn(async () => ({ costEur: 0, calls: 0 })),
  addUsage: vi.fn(async () => ({ costEur: 1 })),
  pauseChat: vi.fn(async () => true),
  dayStats: vi.fn(async () => ({ messages: 7, visitors: 3 })),
  userMessagesLastHour: vi.fn(async () => 0),
  ...over,
});
const now = new Date("2026-11-05T04:30:00Z");
const usage = { inputTokens: 1000, cachedInputTokens: 0, outputTokens: 100 };

describe("cost", () => {
  it("costEur counts cached input at the cached price", () => {
    const price = { inputUsd: 1, cachedInputUsd: 0.1, outputUsd: 2 };
    const eur = costEur({ inputTokens: 1_000_000, cachedInputTokens: 600_000, outputTokens: 500_000 }, price, 0.5);
    expect(eur).toBeCloseTo((0.4 * 1 + 0.6 * 0.1 + 0.5 * 2) * 0.5, 10);
  });
});

describe("cache write cost", () => {
  it("charges cache writes at cacheWriteUsd and only the rest of the input at inputUsd", () => {
    const price = { inputUsd: 1, cachedInputUsd: 0.1, cacheWriteUsd: 1.25, outputUsd: 2 };
    const usage = { inputTokens: 1_000_000, cachedInputTokens: 300_000, cacheWriteTokens: 500_000, outputTokens: 0 };
    expect(costEur(usage, price, 1)).toBeCloseTo(0.2 * 1 + 0.3 * 0.1 + 0.5 * 1.25, 10);
  });

  it("charges cache writes at inputUsd when cacheWriteUsd is absent", () => {
    const price = { inputUsd: 1, cachedInputUsd: 0.1, outputUsd: 2 };
    const usage = { inputTokens: 1_000_000, cacheWriteTokens: 400_000 };
    expect(costEur(usage, price, 1)).toBeCloseTo(1, 10);
  });

  it("never charges negative uncached input", () => {
    const price = { inputUsd: 1, cachedInputUsd: 0.1, cacheWriteUsd: 1.25, outputUsd: 2 };
    const usage = { inputTokens: 100, cachedInputTokens: 100, cacheWriteTokens: 100 };
    expect(costEur(usage, price, 1)).toBeCloseTo((100 * 0.1 + 100 * 1.25) / 1e6, 12);
  });

  it("recordUsage prices cache writes but keeps the addUsage fields", async () => {
    const db = fakeDb();
    const priced = { ...settings, models: { m: { inputUsd: 1, cachedInputUsd: 0.5, cacheWriteUsd: 4, outputUsd: 2 } } };
    await recordUsage({
      db, email: { send: vi.fn() }, settings: priced, model: "m",
      usage: { inputTokens: 1_000_000, cachedInputTokens: 0, cacheWriteTokens: 1_000_000, outputTokens: 0 }, now,
    });
    const arg = db.addUsage.mock.calls[0][0];
    expect(arg.costEur).toBeCloseTo(4 * 0.5, 10);
    expect(arg).not.toHaveProperty("cacheWriteTokens");
  });

  it("a non-finite cacheWriteUsd throws before recording", async () => {
    const db = fakeDb();
    const bad = { ...settings, models: { m: { inputUsd: 1, cachedInputUsd: 0.5, cacheWriteUsd: NaN, outputUsd: 2 } } };
    await expect(recordUsage({ db, email: { send: vi.fn() }, settings: bad, model: "m", usage, now })).rejects.toThrow();
    expect(db.addUsage).not.toHaveBeenCalled();
  });
});

describe("cost defaults", () => {
  it("costEur with no cachedInputTokens charges all input at the input price", () => {
    const price = { inputUsd: 1, cachedInputUsd: 0.1, outputUsd: 2 };
    expect(costEur({ inputTokens: 1_000_000, outputTokens: 0 }, price, 1)).toBeCloseTo(1, 10);
  });
});

describe("chicagoDay", () => {
  it("handles the DST boundaries", () => {
    expect(chicagoDay(new Date("2026-11-01T06:30:00Z"), "America/Chicago")).toBe("2026-11-01");
    expect(chicagoDay(new Date("2026-03-08T05:30:00Z"), "America/Chicago")).toBe("2026-03-07");
  });

  it("chicagoDay of 2026-11-05T04:30Z is 2026-11-04", () => {
    expect(chicagoDay(now, "America/Chicago")).toBe("2026-11-04");
  });
});

describe("isAvailable", () => {
  it("unavailable when paused", async () => {
    const db = fakeDb({ getChatState: vi.fn(async () => ({ status: "paused" })) });
    expect(await isAvailable({ db, settings, now })).toBe(false);
  });
  it("unavailable at the cap", async () => {
    const db = fakeDb({ getUsage: vi.fn(async () => ({ costEur: 5, calls: 9 })) });
    expect(await isAvailable({ db, settings, now })).toBe(false);
  });
  it("available just under the cap", async () => {
    const db = fakeDb({ getUsage: vi.fn(async () => ({ costEur: 4.99, calls: 9 })) });
    expect(await isAvailable({ db, settings, now })).toBe(true);
    expect(db.getUsage).toHaveBeenCalledWith("st-ange", "2026-11-04");
  });
});

describe("manual resume", () => {
  const resumedToday = { status: "active", resumedAt: new Date("2026-11-05T01:00:00Z"), resumeCostEur: 5.02 };
  const resumedYesterday = { status: "active", resumedAt: new Date("2026-11-04T01:00:00Z"), resumeCostEur: 5.02 };

  it("paused at the cap, resumed today: available again until another full cap is spent", async () => {
    const at = (spent) => fakeDb({ getChatState: vi.fn(async () => resumedToday), getUsage: vi.fn(async () => ({ costEur: spent })) });
    expect(await isAvailable({ db: at(5.02), settings, now })).toBe(true);
    expect(await isAvailable({ db: at(10.01), settings, now })).toBe(true);
    expect(await isAvailable({ db: at(10.02), settings, now })).toBe(false);
  });

  it("resumed today: recordUsage pauses only after another full cap", async () => {
    const run = async (total) => {
      const db = fakeDb({ getChatState: vi.fn(async () => resumedToday), addUsage: vi.fn(async () => ({ costEur: total })) });
      await recordUsage({ db, email: { send: vi.fn(async () => {}) }, settings, model: "m", usage, now });
      return db.pauseChat.mock.calls.length;
    };
    expect(await run(9)).toBe(0);
    expect(await run(10.03)).toBe(1);
  });

  it("resumed on an earlier day: the normal daily cap applies", async () => {
    const db = fakeDb({ getChatState: vi.fn(async () => resumedYesterday), getUsage: vi.fn(async () => ({ costEur: 5 })) });
    expect(await isAvailable({ db, settings, now })).toBe(false);
    const db2 = fakeDb({ getChatState: vi.fn(async () => resumedYesterday), addUsage: vi.fn(async () => ({ costEur: 5.01 })) });
    await recordUsage({ db: db2, email: { send: vi.fn(async () => {}) }, settings, model: "m", usage, now });
    expect(db2.pauseChat).toHaveBeenCalledTimes(1);
  });
});

describe("assertPriced", () => {
  it("returns the price for a priced model and throws otherwise", () => {
    expect(assertPriced(settings, "m")).toBe(settings.models.m);
    expect(() => assertPriced(settings, undefined)).toThrow("No price for model undefined");
    expect(() => assertPriced(settings, "x")).toThrow("No price for model x");
    expect(() => assertPriced({ ...settings, eurPerUsd: 0 }, "m")).toThrow("eurPerUsd");
  });
});

describe("checkLimits", () => {
  const run = (over = {}, db = fakeDb()) =>
    checkLimits({ db, settings, conversation: { messageCount: 1 }, ipHash: "h", text: "hi", ...over });
  it("ok within limits", async () => {
    expect(await run()).toEqual({ ok: true });
  });
  it("too_long at 501 characters", async () => {
    expect(await run({ text: "a".repeat(501) })).toEqual({ ok: false, reason: "too_long" });
    expect((await run({ text: "a".repeat(500) })).ok).toBe(true);
  });
  it("conversation_limit when messageCount is 20", async () => {
    expect(await run({ conversation: { messageCount: 20 } })).toEqual({ ok: false, reason: "conversation_limit" });
  });
  it("hourly_limit at 40", async () => {
    const db = fakeDb({ userMessagesLastHour: vi.fn(async () => 40) });
    expect(await run({}, db)).toEqual({ ok: false, reason: "hourly_limit" });
    expect(db.userMessagesLastHour).toHaveBeenCalledWith("h");
  });
  it("perHour 0 switches the hourly limit off without counting", async () => {
    const db = fakeDb({ userMessagesLastHour: vi.fn(async () => 999) });
    const off = { ...settings, limits: { ...settings.limits, perHour: 0 } };
    expect(await checkLimits({ db, settings: off, conversation: { messageCount: 1 }, ipHash: "h", text: "hi" })).toEqual({ ok: true });
    expect(db.userMessagesLastHour).not.toHaveBeenCalled();
  });
});

describe("recordUsage", () => {
  it("under the cap records and does not pause", async () => {
    const db = fakeDb({ addUsage: vi.fn(async () => ({ costEur: 1 })) });
    const email = { send: vi.fn() };
    await recordUsage({ db, email, settings, model: "m", usage, now });
    expect(db.addUsage).toHaveBeenCalledWith(
      expect.objectContaining({ site: "st-ange", day: "2026-11-04", inputTokens: 1000, outputTokens: 100 }),
    );
    expect(db.pauseChat).not.toHaveBeenCalled();
    expect(email.send).not.toHaveBeenCalled();
  });

  it("crossing the cap pauses and sends one alert", async () => {
    const db = fakeDb({ addUsage: vi.fn(async () => ({ costEur: 5.01 })) });
    const email = { send: vi.fn(async () => {}) };
    await recordUsage({ db, email, settings, model: "m", usage, now });
    expect(db.pauseChat).toHaveBeenCalledWith("st-ange", "daily cap reached");
    expect(db.dayStats).toHaveBeenCalledWith("st-ange", "2026-11-04", "America/Chicago");
    expect(email.send).toHaveBeenCalledTimes(1);
    const { subject, text } = email.send.mock.calls[0][0];
    expect(subject).toBe("Chat paused: daily cap reached");
    expect(text).toContain("5.01");
    expect(text).toContain("Messages today: 7");
    expect(text).toContain("Visitors today: 3");
    expect(text).toMatch(/Nov 4, 2026, 10:30\sPM/);
    expect(text).toContain(
      "UPDATE chat_state SET status='active', resumed_at=now(), resume_cost_eur=(SELECT coalesce(sum(cost_eur),0) FROM ai_usage_daily WHERE site='st-ange' AND day=(now() AT TIME ZONE 'America/Chicago')::date) WHERE site='st-ange';",
    );
  });

  it("parallel crossings send exactly one alert", async () => {
    let first = true;
    const db = fakeDb({
      addUsage: vi.fn(async () => ({ costEur: 6 })),
      pauseChat: vi.fn(async () => (first ? ((first = false), true) : false)),
    });
    const email = { send: vi.fn(async () => {}) };
    await Promise.all(Array.from({ length: 5 }, () => recordUsage({ db, email, settings, model: "m", usage, now })));
    expect(email.send).toHaveBeenCalledTimes(1);
  });

  it("a failing alert email does not throw", async () => {
    const db = fakeDb({ addUsage: vi.fn(async () => ({ costEur: 6 })) });
    const email = { send: vi.fn(async () => { throw new Error("smtp down"); }) };
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(recordUsage({ db, email, settings, model: "m", usage, now })).resolves.toBeUndefined();
    log.mockRestore();
  });

  it("a usage object missing cachedInputTokens records a finite cost", async () => {
    const db = fakeDb();
    await recordUsage({
      db, email: { send: vi.fn() }, settings, model: "m",
      usage: { inputTokens: 1000, outputTokens: 100 }, now,
    });
    const arg = db.addUsage.mock.calls[0][0];
    expect(arg.cachedInputTokens).toBe(0);
    expect(Number.isFinite(arg.costEur)).toBe(true);
    expect(arg.costEur).toBeGreaterThan(0);
  });

  it("a price with a non-finite entry throws before recording", async () => {
    const db = fakeDb();
    const bad = { ...settings, models: { m: { inputUsd: 1, outputUsd: 2 } } };
    await expect(recordUsage({ db, email: { send: vi.fn() }, settings: bad, model: "m", usage, now })).rejects.toThrow(
      "No price for model m",
    );
    expect(db.addUsage).not.toHaveBeenCalled();
  });

  it("still alerts when dayStats fails after the pause", async () => {
    const db = fakeDb({
      addUsage: vi.fn(async () => ({ costEur: 6 })),
      dayStats: vi.fn(async () => { throw new Error("db down"); }),
    });
    const email = { send: vi.fn(async () => {}) };
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await recordUsage({ db, email, settings, model: "m", usage, now });
    log.mockRestore();
    const { text } = email.send.mock.calls[0][0];
    expect(text).toContain("Messages today: unavailable");
    expect(text).toContain("6.00");
    expect(text).toContain("UPDATE chat_state");
  });

  it("unknown model throws before recording", async () => {
    const db = fakeDb();
    await expect(recordUsage({ db, email: { send: vi.fn() }, settings, model: "x", usage, now })).rejects.toThrow(
      "No price for model x",
    );
    expect(db.addUsage).not.toHaveBeenCalled();
  });

  it("a missing exchange rate throws before recording", async () => {
    const db = fakeDb();
    await expect(
      recordUsage({ db, email: { send: vi.fn() }, settings: { ...settings, eurPerUsd: null }, model: "m", usage, now }),
    ).rejects.toThrow("eurPerUsd must be a positive number");
    expect(db.addUsage).not.toHaveBeenCalled();
  });
});

describe("reported cost", () => {
  const reporting = { ...settings, providerReportsCost: true };

  it("uses costUsd x eurPerUsd instead of the price table", async () => {
    const db = fakeDb();
    await recordUsage({ db, email: { send: vi.fn() }, settings, model: "m", usage: { ...usage, costUsd: 0.004 }, now });
    expect(db.addUsage.mock.calls[0][0]).toMatchObject({ inputTokens: 1000, cachedInputTokens: 0, outputTokens: 100 });
    expect(db.addUsage.mock.calls[0][0].costEur).toBeCloseTo(0.004 * 0.5, 12);
  });

  it("falls back to the price table when no valid cost is reported", async () => {
    for (const costUsd of [undefined, null, NaN, -1, "0.1"]) {
      const db = fakeDb();
      await recordUsage({ db, email: { send: vi.fn() }, settings, model: "m", usage: { ...usage, costUsd }, now });
      expect(db.addUsage.mock.calls[0][0].costEur).toBeCloseTo(costEur(usage, settings.models.m, 0.5), 12);
    }
  });

  it("assertPriced accepts an unpriced model only when the provider reports cost", () => {
    expect(assertPriced(reporting, "openai/new-model")).toBeUndefined();
    expect(() => assertPriced(settings, "openai/new-model")).toThrow("No price for model openai/new-model");
    expect(() => assertPriced(reporting, undefined)).toThrow("No price for model undefined");
    expect(() => assertPriced(reporting, "")).toThrow("No price for model");
    expect(() => assertPriced({ ...reporting, models: { x: { inputUsd: 1 } } }, "x")).toThrow("No price for model x");
    expect(assertPriced({ ...reporting, models: { x: { reasoningEffort: "low" } } }, "x")).toBeUndefined();
    expect(() => assertPriced({ ...settings, models: { x: { reasoningEffort: "low" } } }, "x")).toThrow("No price for model x");
    expect(() => assertPriced({ ...reporting, eurPerUsd: 0 }, "openai/new-model")).toThrow("eurPerUsd");
  });

  it("an unpriced model with a reported cost records it and follows the normal cap", async () => {
    const db = fakeDb();
    const email = { send: vi.fn() };
    await recordUsage({ db, email, settings: reporting, model: "openai/new-model", usage: { ...usage, costUsd: 0.01 }, now });
    expect(db.addUsage.mock.calls[0][0].costEur).toBeCloseTo(0.005, 12);
    expect(db.pauseChat).not.toHaveBeenCalled();
  });

  it("a :free model's reported cost of 0 is a valid cost, so it runs unpriced without pausing", async () => {
    const db = fakeDb({ addUsage: vi.fn(async () => ({ costEur: 0 })) });
    const email = { send: vi.fn() };
    const model = "google/gemma-4-31b-it:free";
    expect(assertPriced(reporting, model)).toBeUndefined();
    await recordUsage({ db, email, settings: reporting, model, usage: { ...usage, costUsd: 0 }, now });
    expect(db.addUsage.mock.calls[0][0]).toMatchObject({ inputTokens: 1000, outputTokens: 100, costEur: 0 });
    expect(db.pauseChat).not.toHaveBeenCalled();
    expect(email.send).not.toHaveBeenCalled();
  });

  it("an unpriced model without a reported cost records the tokens, pauses the chat and alerts once", async () => {
    let first = true;
    const db = fakeDb({ pauseChat: vi.fn(async () => (first ? ((first = false), true) : false)) });
    const email = { send: vi.fn(async () => {}) };
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await Promise.all([1, 2].map(() => recordUsage({ db, email, settings: reporting, model: "openai/new-model", usage, now })));
    expect(db.addUsage.mock.calls[0][0]).toMatchObject({ inputTokens: 1000, outputTokens: 100, costEur: 0 });
    expect(db.pauseChat).toHaveBeenCalledWith("st-ange", "unpriced call without a reported cost");
    expect(email.send).toHaveBeenCalledTimes(1);
    const { subject, text } = email.send.mock.calls[0][0];
    expect(subject).toBe("Chat paused: a call's cost is unknown");
    expect(text).toContain("openai/new-model");
    expect(text).toContain("UPDATE chat_state");
    expect(log).toHaveBeenCalledWith(expect.stringContaining("reported no cost"), expect.anything());
    log.mockRestore();
  });
});
