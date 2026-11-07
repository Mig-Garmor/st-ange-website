import { describe, expect, it } from "vitest";
import { checkPage } from "./checkStructuredData.js";
import { pageGraph } from "./pageGraph.js";

const url = "https://www.stangeautoservice.com/about";
const page = (graph) =>
  `<link rel="canonical" href="${url}"><script type="application/ld+json">${JSON.stringify(graph)}</script>`;
const graph = pageGraph({ url, title: "About", description: "x", imageUrl: "x", crumbs: [{ label: "Home", to: "/" }, { label: "About", to: "/about" }] });

describe("structured data check", () => {
  it("passes a page built by pageGraph", () => {
    expect(checkPage(page(graph), { isHome: false })).toEqual([]);
  });

  it("fails review markup, a missing breadcrumb and a second block", () => {
    const withReview = { ...graph, "@graph": [...graph["@graph"], { "@type": "Review", reviewBody: "x" }] };
    expect(checkPage(page(withReview), { isHome: false })).toContain("contains Review");
    const noCrumbs = pageGraph({ url, title: "About", description: "x", imageUrl: "x" });
    expect(checkPage(page(noCrumbs), { isHome: false })).toContain("missing BreadcrumbList");
    expect(checkPage(page(graph) + page(graph), { isHome: false })[0]).toMatch(/expected one JSON-LD block/);
  });
});
