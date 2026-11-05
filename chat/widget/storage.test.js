// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { SESSION_TTL_MS, isExpired, loadSession, saveSession, visitorId } from "./storage.js";

afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
  localStorage.clear();
});

describe("chat storage", () => {
  it("round-trips a session with the time it was saved", () => {
    expect(loadSession()).toBeNull();
    const session = { id: "abc", messages: [{ id: "m1", role: "user", parts: [{ type: "text", text: "Hi" }] }] };
    saveSession(session, 1_000);
    expect(JSON.parse(sessionStorage.getItem("chat:session"))).toEqual({ ...session, savedAt: 1_000 });
    expect(loadSession(1_000)).toEqual({ ...session, savedAt: 1_000 });
  });

  it("a session idle for 60 minutes is gone, one idle for just under is kept", () => {
    saveSession({ id: "abc", messages: [] }, 0);
    expect(loadSession(SESSION_TTL_MS - 1)?.id).toBe("abc");
    expect(loadSession(SESSION_TTL_MS)).toBeNull();
  });

  it("a session saved before expiry existed counts as expired", () => {
    sessionStorage.setItem("chat:session", JSON.stringify({ id: "old", messages: [] }));
    expect(loadSession()).toBeNull();
    expect(isExpired(undefined)).toBe(true);
    expect(SESSION_TTL_MS).toBe(60 * 60 * 1000);
  });

  it("visitorId is stable", () => {
    const first = visitorId();
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    expect(visitorId()).toBe(first);
    expect(localStorage.getItem("chat:visitor")).toBe(first);
  });

  it("works when sessionStorage throws", () => {
    const fail = () => {
      throw new Error("blocked");
    };
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(fail);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(fail);
    const session = { id: "xyz", messages: [] };
    expect(() => saveSession(session, 5)).not.toThrow();
    expect(loadSession(5)).toEqual({ ...session, savedAt: 5 });
    const id = visitorId();
    expect(id).toBeTruthy();
    expect(visitorId()).toBe(id);
  });
});
