import fs from "fs";
import path from "path";

const SCRIPT = /<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs;
const CANONICAL = /<link rel="canonical" href="([^"]+)"/;
// Google forbids a business marking up its own reviews or ratings copied from Google Maps.
const FORBIDDEN = ["Review", "AggregateRating"];

const typesIn = (value, found = new Set()) => {
  if (Array.isArray(value)) value.forEach((item) => typesIn(item, found));
  else if (value && typeof value === "object") {
    if (value["@type"]) found.add(value["@type"]);
    Object.values(value).forEach((item) => typesIn(item, found));
  }
  return found;
};

// Returns the problems found on one built page; an empty list means it passes.
export function checkPage(html, { isHome }) {
  const blocks = [...html.matchAll(SCRIPT)].map((m) => m[1]);
  if (blocks.length !== 1) return [`expected one JSON-LD block, found ${blocks.length}`];
  let data;
  try {
    data = JSON.parse(blocks[0]);
  } catch (error) {
    return [`JSON-LD does not parse: ${error.message}`];
  }
  const graph = data["@graph"] ?? [];
  const types = typesIn(graph);
  const canonical = html.match(CANONICAL)?.[1];
  const problems = [];
  for (const type of ["AutoRepair", "WebSite"]) if (!types.has(type)) problems.push(`missing ${type}`);
  if (!graph.some((node) => node["@id"] === `${canonical}#webpage`)) problems.push(`no page node with @id ${canonical}#webpage`);
  if (!isHome && !types.has("BreadcrumbList")) problems.push("missing BreadcrumbList");
  for (const type of FORBIDDEN) if (types.has(type)) problems.push(`contains ${type}`);
  if (/"(aggregateRating|review)"\s*:/.test(blocks[0])) problems.push("contains a rating or review property");
  return problems;
}

export function checkStructuredData(outDir) {
  const pages = fs.readdirSync(outDir, { recursive: true }).filter((file) => file.endsWith(".html"));
  const failures = pages.flatMap((file) =>
    checkPage(fs.readFileSync(path.join(outDir, file), "utf8"), { isHome: file === "index.html" }).map((p) => `${file}: ${p}`),
  );
  if (failures.length) throw new Error(`Structured data check failed:\n${failures.join("\n")}`);
}
