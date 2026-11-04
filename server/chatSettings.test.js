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

  it("uses the fixed chat copy", () => {
    expect(chatServerSettings.copy).toEqual({
      offline: "Our chat is offline right now. Call us at 832-572-7121 or send a quote request.",
      limit: "Let's pick this up by phone: call us at 832-572-7121.",
      unavailable: "Chat is unavailable right now. Call us at 832-572-7121.",
    });
  });

  it("prices the default chat model", () => {
    const price = chatServerSettings.models["gpt-6-luna"];
    expect(price).toMatchObject({ inputUsd: 0.1, cachedInputUsd: 0.01, cacheWriteUsd: 0.125, outputUsd: 0.5 });
    expect(chatServerSettings.eurPerUsd).toBeGreaterThan(0);
  });
});
