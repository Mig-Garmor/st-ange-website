import { describe, expect, it } from "vitest";
import { business, hoursAndLocation, services } from "../src/config/business.js";
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
    expect(chatServerSettings.localAreaCodes).toEqual(["281", "832", "346", "713"]);
  });

  it("uses the fixed chat copy", () => {
    expect(chatServerSettings.copy).toEqual({
      offline: "Our chat is offline right now. Call us at 832-572-7121 or send a quote request.",
      limit: "Let's pick this up by phone: call us at 832-572-7121.",
      unavailable: "Chat is unavailable right now. Call us at 832-572-7121.",
    });
  });

  it("prices the default chat model and its Anthropic alternative as a fallback", () => {
    for (const model of ["openai/gpt-6-luna", "anthropic/claude-haiku-5.5"]) {
      expect(chatServerSettings.models[model]).toMatchObject({ inputUsd: 0.1, cachedInputUsd: 0.01, cacheWriteUsd: 0.125, outputUsd: 0.5 });
    }
    expect(chatServerSettings.providerReportsCost).toBe(true);
    expect(chatServerSettings.defaultReasoningEffort).toBe("none");
    expect(chatServerSettings.eurPerUsd).toBeGreaterThan(0);
  });

  it("the instant hours and location answer lists the address, every hours slot and the phone", () => {
    expect(hoursAndLocation).toContain("108 Schilling Ave, Baytown, TX 77520");
    for (const slot of business.hours) expect(hoursAndLocation).toContain(`${slot.label}: ${slot.display}`);
    expect(hoursAndLocation).toContain(business.phone.display);
    expect(hoursAndLocation.split("\n").length).toBeLessThanOrEqual(6);
  });
});
