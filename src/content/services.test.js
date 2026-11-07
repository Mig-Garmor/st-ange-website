import { describe, expect, it } from "vitest";
import { business, withContact } from "../config/business.js";
import { servicePages } from "./services.js";

describe("service meta descriptions", () => {
  it("stay within 160 characters once the address, phone and hours are added", () => {
    for (const page of servicePages) {
      const description = withContact(page.metaDescription);
      expect(description.length, page.slug).toBeLessThanOrEqual(160);
      expect(description).toContain(business.phone.display);
      expect(description).toContain("Baytown, TX");
    }
  });
});
