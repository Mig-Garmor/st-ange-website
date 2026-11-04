import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const chatDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(chatDir, "..");
const forbidden = ["src", "server"].map((dir) => join(root, dir) + sep);
const ALIAS = /^@(components|styles|composables|modules)?(\/|$)/;
const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*|^\s*import\s+)["']([^"']+)["']/gm;

const sourceFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(js|vue)$/.test(entry.name) && !entry.name.endsWith(".test.js") ? [path] : [];
  });

const specifiers = (file) => [...readFileSync(file, "utf8").matchAll(SPECIFIER)].map((m) => m[1]);

function violations(file, seen = new Set()) {
  if (seen.has(file)) return [];
  seen.add(file);
  return specifiers(file).flatMap((spec) => {
    if (ALIAS.test(spec)) return [`${relative(root, file)} -> ${spec}`];
    if (!spec.startsWith(".")) return [];
    const target = resolve(dirname(file), spec);
    if (forbidden.some((dir) => target.startsWith(dir))) return [`${relative(root, file)} -> ${spec}`];
    if (!target.startsWith(chatDir + sep)) return [`${relative(root, file)} -> ${spec} (outside chat/)`];
    return violations(target, seen);
  });
}

describe("chat/ boundary", () => {
  it("no file under chat/ imports from src/ or server/, directly or transitively", () => {
    const files = sourceFiles(chatDir);
    expect(files.length).toBeGreaterThan(5);
    expect(files.flatMap((file) => violations(file))).toEqual([]);
  });

  it("treats the src/ path aliases as forbidden but not scoped packages", () => {
    expect(ALIAS.test("@/modules/validate.js")).toBe(true);
    expect(ALIAS.test("@ai-sdk/vue")).toBe(false);
  });
});
