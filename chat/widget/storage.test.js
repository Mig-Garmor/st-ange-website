// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadSession, saveSession, visitorId } from "./storage.js";

afterEach(() => {
  vi.restoreAllMocks();
  sessionStorage.clear();
  localStorage.clear();
});

describe("chat storage", () => {
  it("round-trips a session", () => {
    expect(loadSession()).toBeNull();
    const session = { id: "abc", messages: [{ id: "m1", role: "user", parts: [{ type: "text", text: "Hi" }] }] };
    saveSession(session);
    expect(JSON.parse(sessionStorage.getItem("chat:session"))).toEqual(session);
    expect(loadSession()).toEqual(session);
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
    expect(() => saveSession(session)).not.toThrow();
    expect(loadSession()).toEqual(session);
    const id = visitorId();
    expect(id).toBeTruthy();
    expect(visitorId()).toBe(id);
  });
});
