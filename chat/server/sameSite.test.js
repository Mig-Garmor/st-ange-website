import { describe, it, expect } from "vitest";
import { rejectCrossSite } from "./sameSite.js";

const req = (headers) => new Request("https://shop.example/api/chat", { method: "POST", headers, body: "{}" });

describe("rejectCrossSite", () => {
  it("allows same-site JSON, and JSON with no Origin (curl, server to server)", () => {
    expect(rejectCrossSite(req({ "content-type": "application/json", origin: "https://shop.example" }))).toBeNull();
    expect(rejectCrossSite(req({ "content-type": "application/json; charset=utf-8" }))).toBeNull();
  });

  it("403 for another site's Origin, including a malformed or null one", () => {
    for (const origin of ["https://evil.example", "https://shop.example.evil.example", "null"]) {
      expect(rejectCrossSite(req({ "content-type": "application/json", origin })).status).toBe(403);
    }
  });

  it("415 for a body that is not declared as JSON, which a cross-site form or no-cors fetch would send", () => {
    for (const type of ["text/plain", "application/x-www-form-urlencoded", undefined]) {
      expect(rejectCrossSite(req(type ? { "content-type": type } : {})).status).toBe(415);
    }
  });
});
