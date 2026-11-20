import { describe, expect, it } from "vitest";
import { checkServiceLinks } from "./checkServiceLinks.js";

describe("service link tracking check", () => {
  it("passes tracked links and a page's link to itself", () => {
    const html =
      '<a href="/services/tires" data-hub-tag="service_click" data-hub-service="tires" data-hub-from="footer">' +
      '<a aria-current="page" href="/services/tires#quote">';
    expect(checkServiceLinks(html)).toEqual([]);
  });

  it("fails an untracked link, a wrong service and a missing from", () => {
    const html =
      '<a href="/services/tires">' +
      '<a href="/services/tires" data-hub-tag="service_click" data-hub-service="brake-repair" data-hub-from="faq">' +
      '<a href="/services/tires" data-hub-tag="service_click" data-hub-service="tires">';
    expect(checkServiceLinks(html)).toHaveLength(3);
  });
});
