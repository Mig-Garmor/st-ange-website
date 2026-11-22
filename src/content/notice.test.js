import { describe, expect, it } from "vitest";
import { isNoticeActive } from "./notice.js";

describe("isNoticeActive", () => {
  it("shows until the shop reopens Monday at 8 AM in Baytown, then hides", () => {
    expect(isNoticeActive(Date.parse("2026-11-29T12:00:00-06:00"))).toBe(true);
    expect(isNoticeActive(Date.parse("2026-11-30T07:59:00-06:00"))).toBe(true);
    expect(isNoticeActive(Date.parse("2026-11-30T08:00:00-06:00"))).toBe(false);
  });
});
