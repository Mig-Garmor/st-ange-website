import { describe, expect, it } from "vitest";
import { services } from "../config/business.js";
import { reviewsForService } from "./reviews.js";

describe("reviewsForService", () => {
  it("never shows the same review twice on a service page", () => {
    for (const { slug } of services) {
      const texts = reviewsForService(slug).cards.map((card) => card.reviewId);
      expect(new Set(texts).size, slug).toBe(texts.length);
    }
  });
});
