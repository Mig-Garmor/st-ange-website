import { describe, it, expect, vi } from "vitest";
import { costEur } from "./cost.js";
import { chicagoDay, isAvailable, checkLimits, recordUsage } from "./limits.js";

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

describe("chicagoDay", () => {
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
    expect(email.send).toHaveBeenCalledTimes(1);
    const { subject, text } = email.send.mock.calls[0][0];
    expect(subject).toBe("Chat paused: daily cap reached");
    expect(text).toContain("5.01");
    expect(text).toContain("7");
    expect(text).toContain("3");
    expect(text).toContain("UPDATE chat_state SET status='active', resumed_at=now() WHERE site='st-ange'");
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
    ).rejects.toThrow();
    expect(db.addUsage).not.toHaveBeenCalled();
  });
});
