import { describe, it, expect, vi } from "vitest";
import { createTurnstile } from "./turnstile.js";
import { hashIp, clientIp } from "./ipHash.js";

const reply = (body) => vi.fn(async () => ({ ok: true, json: async () => body }));

describe("turnstile", () => {
  it("true on success", async () => {
    const fetch = reply({ success: true });
    const t = createTurnstile({ secret: "s", fetch });
    expect(await t.verify("tok", "1.2.3.4")).toBe(true);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    const body = new URLSearchParams(init.body);
    expect(body.get("secret")).toBe("s");
    expect(body.get("response")).toBe("tok");
    expect(body.get("remoteip")).toBe("1.2.3.4");
  });

  it("false on success:false", async () => {
    const t = createTurnstile({ secret: "s", fetch: reply({ success: false }) });
    expect(await t.verify("tok", "1.2.3.4")).toBe(false);
  });

  it("false without token, and fetch not called", async () => {
    const fetch = reply({ success: true });
    const t = createTurnstile({ secret: "s", fetch });
    expect(await t.verify("", "1.2.3.4")).toBe(false);
    expect(await t.verify(undefined, "1.2.3.4")).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("false when fetch rejects", async () => {
    const fetch = vi.fn(async () => {
      throw new Error("down");
    });
    const t = createTurnstile({ secret: "s", fetch });
    expect(await t.verify("tok", "1.2.3.4")).toBe(false);
  });

  it("false on non-OK response", async () => {
    const fetch = vi.fn(async () => ({ ok: false, json: async () => ({ success: true }) }));
    const t = createTurnstile({ secret: "s", fetch });
    expect(await t.verify("tok", "1.2.3.4")).toBe(false);
  });
});

describe("ipHash", () => {
  it("hashIp is stable and differs by salt", () => {
    const a = hashIp("1.2.3.4", "salt1");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(hashIp("1.2.3.4", "salt1")).toBe(a);
    expect(hashIp("1.2.3.4", "salt2")).not.toBe(a);
  });

  it("clientIp takes the first x-forwarded-for entry", () => {
    const req = (h) => ({ headers: new Headers(h) });
    expect(clientIp(req({ "x-forwarded-for": "9.9.9.9, 1.1.1.1" }))).toBe("9.9.9.9");
    expect(clientIp(req({}))).toBe("unknown");
  });
});
