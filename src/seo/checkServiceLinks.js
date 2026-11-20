import fs from "node:fs";
import path from "node:path";

// Every link to a service page must be counted in Website Hub; a page's link to itself (aria-current) is not a click to another service.
export function checkServiceLinks(html) {
  const links = html.match(/<a\b[^>]*href="\/services\/[^"]+"[^>]*>/g) ?? [];
  return links
    .filter((a) => !a.includes("aria-current"))
    .filter((a) => {
      const slug = a.match(/href="\/services\/([^"#?]+)/)[1];
      return !a.includes('data-hub-tag="service_click"') || !a.includes(`data-hub-service="${slug}"`) || !/data-hub-from="\w+"/.test(a);
    })
    .map((a) => `untracked service link ${a}`);
}

export function checkAllServiceLinks(outDir) {
  const pages = fs.readdirSync(outDir, { recursive: true }).filter((file) => file.endsWith(".html"));
  const failures = pages.flatMap((file) => checkServiceLinks(fs.readFileSync(path.join(outDir, file), "utf8")).map((p) => `${file}: ${p}`));
  if (failures.length) throw new Error(`Service link tracking check failed:\n${failures.join("\n")}`);
}
