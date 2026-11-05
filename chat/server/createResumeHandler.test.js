import { describe, expect, it, vi } from "vitest";
import { createResumeHandler } from "./createResumeHandler.js";

const PREV = "11111111-2222-4333-8444-555555555555";
const post = (body, headers = {}) =>
  new Request("http://localhost/api/chat-resume", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });

describe("createResumeHandler", () => {
  it("returns masked details for the same visitor's recent chat", async () => {
    const db = { carryOverSource: vi.fn(async () => ({ summary: null, lead: {}, userMessages: ["2015 Ford F-150, 281-555-0166, dana@mailinator.com, my name is Dana"] })) };
    const res = await createResumeHandler({ site: "s" }, { db })(post({ previousId: PREV, visitorId: "v-1" }));
    expect(await res.json()).toEqual({ resume: { vehicle: "2015 Ford F-150", phone: "ending 0166", email: "d***@mailinator.com" } });
    expect(db.carryOverSource).toHaveBeenCalledWith({ site: "s", previousId: PREV, visitorId: "v-1" });
  });

  it("returns null when there is nothing to continue or the lookup fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    for (const carryOverSource of [vi.fn(async () => null), vi.fn(async () => { throw new Error("db"); })]) {
      const res = await createResumeHandler({ site: "s" }, { db: { carryOverSource } })(post({ previousId: PREV, visitorId: "v-1" }));
      expect(await res.json()).toEqual({ resume: null });
    }
    error.mockRestore();
  });

  it("rejects bad ids and cross-site posts before the database", async () => {
    const db = { carryOverSource: vi.fn() };
    const handler = createResumeHandler({ site: "s" }, { db });
    expect((await handler(post({ previousId: "x", visitorId: "v-1" }))).status).toBe(400);
    expect((await handler(post({ previousId: PREV, visitorId: "a b" }))).status).toBe(400);
    expect((await handler(post({ previousId: PREV, visitorId: "v-1" }, { origin: "https://evil.example" }))).status).toBe(403);
    expect(db.carryOverSource).not.toHaveBeenCalled();
  });
});
