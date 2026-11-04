import { describe, expect, it } from "vitest";
import { services } from "../src/config/business.js";
import { allReviews } from "../src/content/reviews.js";
import { chatServerSettings } from "./chatSettings.js";

describe("chatServerSettings", () => {
  it("knowledge mentions 108 Schilling Ave and every service", () => {
    const { knowledge } = chatServerSettings;
    expect(knowledge).toContain("108 Schilling Ave");
    for (const service of services) expect(knowledge).toContain(service.name);
  });

  it("knowledge contains no review text", () => {
    const { knowledge } = chatServerSettings;
    const long = allReviews.filter((review) => review.text.length > 40);
    expect(long.length).toBeGreaterThan(0);
    for (const review of long) expect(knowledge).not.toContain(review.text.slice(0, 40));
  });

  it("exposes the fixed limits", () => {
    expect(chatServerSettings.limits).toEqual({ maxChars: 500, maxUserMessages: 20, perHour: 40 });
    expect(chatServerSettings.services.map((s) => s.slug)).toEqual(services.map((s) => s.slug));
  });
});
