import { describe, expect, it } from "vitest";
import { business, withContact } from "../config/business.js";
import { pageDescriptions } from "./pages.js";
import { servicePages } from "./services.js";

const descriptions = [
  ...Object.entries(pageDescriptions),
  ...servicePages.map((page) => [page.slug, page.metaDescription]),
];

describe("meta descriptions", () => {
  it("stay within 160 characters once the address, phone and hours are added", () => {
    for (const [page, text] of descriptions) {
      const description = withContact(text);
      expect(description.length, page).toBeLessThanOrEqual(160);
      expect(description).toContain(business.phone.display);
      expect(description).toContain("Baytown, TX");
    }
  });
});
