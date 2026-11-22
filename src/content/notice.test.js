import { describe, expect, it } from "vitest";
import { isNoticeActive } from "./notice.js";

describe("isNoticeActive", () => {
  it("shows through Saturday night in Baytown and hides from midnight", () => {
    expect(isNoticeActive(Date.parse("2026-11-28T23:59:00-06:00"))).toBe(true);
    expect(isNoticeActive(Date.parse("2026-11-29T00:00:00-06:00"))).toBe(false);
  });
});
