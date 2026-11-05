// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { CARRY_TTL_MS, SESSION_TTL_MS, forgetChat, isExpired, loadSession, recentChatId, rememberChat, saveSession, visitorId } from "./storage.js";

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
    expect(JSON.parse(sessionStorage.getItem("chat:session"))).toEqual({ ...session, previousId: null, savedAt: 1_000 });
    expect(loadSession(1_000)).toEqual({ ...session, previousId: null, savedAt: 1_000 });
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
    expect(loadSession(5)).toEqual({ ...session, previousId: null, savedAt: 5 });
    const id = visitorId();
    expect(id).toBeTruthy();
    expect(visitorId()).toBe(id);
  });

  it("remembers the last chat for 24 hours in localStorage, so a new tab can continue it", () => {
    rememberChat("chat-1", 0);
    expect(localStorage.getItem("chat:last")).toBe(JSON.stringify({ id: "chat-1", at: 0 }));
    expect(recentChatId(CARRY_TTL_MS - 1)).toBe("chat-1");
    expect(recentChatId(CARRY_TTL_MS)).toBeNull();
    expect(localStorage.getItem("chat:last")).toBeNull();
    rememberChat("chat-2", 0);
    forgetChat();
    expect(recentChatId(0)).toBeNull();
    localStorage.clear();
    expect(recentChatId(0)).toBeNull();
  });

  it("keeps the earlier chat's id with the session", () => {
    saveSession({ id: "new", messages: [], previousId: "old" }, 10);
    expect(loadSession(10).previousId).toBe("old");
  });
});
