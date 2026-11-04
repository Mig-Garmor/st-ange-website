import { describe, expect, it } from "vitest";
import { buildInstructions } from "./prompt.js";

const settings = {
  timeZone: "America/Chicago",
  phoneDisplay: "555-000-1111",
  knowledge: "KNOWLEDGE TEXT",
  featured: "FEATURED TEXT",
  services: [
    { slug: "a", name: "Alpha Service" },
    { slug: "b", name: "Beta Service" },
  ],
  hours: [
    { days: ["Monday", "Tuesday"], opens: "08:00", closes: "18:00" },
    { days: ["Saturday"], opens: "08:00", closes: "17:00" },
    { days: [], display: "Closed" },
  ],
};

const monday10 = new Date("2026-11-02T16:00:00Z");
const sunday10 = new Date("2026-11-01T16:00:00Z");

describe("buildInstructions", () => {
  it("stable is identical for different now and pageUrl", () => {
    const a = buildInstructions(settings, { playbooks: [], now: monday10, pageUrl: "/a" });
    const b = buildInstructions(settings, { playbooks: [], now: sunday10, pageUrl: "/b" });
    expect(a.stable).toBe(b.stable);
    expect(a.variable).not.toBe(b.variable);
  });

  it("stable contains every service name and the phone", () => {
    const { stable } = buildInstructions(settings, { playbooks: [], now: monday10, pageUrl: "/" });
    expect(stable).toContain("Alpha Service");
    expect(stable).toContain("Beta Service");
    expect(stable).toContain("555-000-1111");
  });

  it("stable includes active playbooks after knowledge", () => {
    const { stable } = buildInstructions(settings, {
      playbooks: [{ intent: "alignment", content: "Ask about pulling." }],
      now: monday10,
      pageUrl: "/",
    });
    expect(stable).toContain("## Playbook: alignment");
    expect(stable.indexOf("## Playbook: alignment")).toBeGreaterThan(stable.indexOf("FEATURED TEXT"));
    expect(stable.indexOf("FEATURED TEXT")).toBeGreaterThan(stable.indexOf("KNOWLEDGE TEXT"));
    expect(stable).toContain("Ask about pulling.");
  });

  it("no playbook heading when none", () => {
    const { stable } = buildInstructions(settings, { playbooks: [], now: monday10, pageUrl: "/" });
    expect(stable).not.toContain("## Playbook");
  });

  it("variable says Open now on a Monday at 10:00 Chicago and Closed now on Sunday", () => {
    const open = buildInstructions(settings, { playbooks: [], now: monday10, pageUrl: "/x" }).variable;
    const closed = buildInstructions(settings, { playbooks: [], now: sunday10, pageUrl: "/x" }).variable;
    expect(open).toContain("Open now");
    expect(open).toContain("Current page: /x");
    expect(closed).toContain("Closed now");
  });

  it("uses the shop time zone, not UTC", () => {
    const earlyUtc = new Date("2026-11-02T13:00:00Z");
    const { variable } = buildInstructions(settings, { playbooks: [], now: earlyUtc, pageUrl: "/" });
    expect(variable).toContain("Closed now");
  });

  it.each([
    ["Monday 08:00", "2026-11-02T14:00:00Z", "Open now"],
    ["Monday 18:00", "2026-11-03T00:00:00Z", "Closed now"],
    ["Saturday 16:59", "2026-11-07T22:59:00Z", "Open now"],
    ["Saturday 17:00", "2026-11-07T23:00:00Z", "Closed now"],
  ])("%s Chicago is %s", (_label, iso, expected) => {
    const { variable } = buildInstructions(settings, { playbooks: [], now: new Date(iso), pageUrl: "/" });
    expect(variable).toContain(expected);
  });
});
