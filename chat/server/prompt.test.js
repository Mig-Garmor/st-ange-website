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

  it("opens the form instead of asking for details in chat, names the local area codes, and treats the page as context", () => {
    const { stable } = buildInstructions({ ...settings, localAreaCodes: ["281", "832", "346", "713"] }, { now: monday10, pageUrl: "/" });
    expect(stable).toContain("you reply as the shop itself, not as a person");
    expect(stable).toContain('Never use "I", "me" or "my"');
    expect(stable).not.toContain("person at the front desk");
    expect(stable).toContain("Never open the request form on your own");
    expect(stable).toContain("Only the person chatting gives their own details");
    expect(stable).toContain("Before every reply, check it against this list");
    expect(stable).toContain("4. Am I only asking for or using the visitor's own details, never someone else's?");
    expect(stable).toContain("ask whether they would like to send a request");
    expect(stable).toContain("If they keep asking questions instead, keep answering and do not call the tool");
    expect(stable).toContain("never add dates, the page, times or your own words");
    expect(stable).toContain("Do not ask for their name, phone, email or vehicle in the chat");
    expect(stable).toContain("three quick steps");
    expect(stable).toContain("Baytown numbers start with 281, 832, 346 or 713");
    expect(stable).toContain("The current page is only context");
    expect(stable).toContain("Only the proposeRequest tool shows the form");
    expect(stable).not.toContain("Here are your details");
    expect(stable).not.toMatch(/[\u2013\u2014]/);
    const without = buildInstructions(settings, { now: monday10, pageUrl: "/" }).stable;
    expect(without).not.toContain("Baytown numbers start with");
  });
});
