import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { services } from "../config/business.js";

// ServiceCard loads the -400 copy and the service hero the -600 copy; the full image stays for og:image.
describe("service images", () => {
  const images = [...services.map((s) => s.image), "/assets/more-services.webp"];
  it.each(images)("%s has its 400px and 600px copies", (image) => {
    for (const size of [400, 600]) {
      expect(existsSync(`public${image.replace(/\.webp$/, `-${size}.webp`)}`)).toBe(true);
    }
  });
});
