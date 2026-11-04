import { describe, expect, it } from "vitest";
import { validateLead } from "../../server/validate.js";
import { checkProposal, cleanEmail, cleanService, formatPhone } from "./proposal.js";

const slugs = ["brakes", "car-alignment"];
const valid = { service: "brakes", name: "Ann", phone: "832.555.0100", email: "ann@example.com", vehicle: "2019 Civic", notes: "Squeal" };

describe("proposal", () => {
  it("cleanEmail turns placeholders into null", () => {
    for (const v of ["", "  ", "none", "None", "N/A", "n/a", "no", "-", null, undefined]) expect(cleanEmail(v)).toBeNull();
    expect(cleanEmail(" ann@example.com ")).toBe("ann@example.com");
  });

  it("cleanService keeps a known slug and maps anything else to null", () => {
    expect(cleanService("brakes", slugs)).toBe("brakes");
    expect(cleanService(" Car-Alignment ", slugs)).toBe("car-alignment");
    expect(cleanService("oil change", slugs)).toBeNull();
    expect(cleanService(null, slugs)).toBeNull();
  });

  it("formatPhone uses the shop's display style", () => {
    expect(formatPhone("8325727121")).toBe("832-572-7121");
  });

  it("an ok proposal returns the normalised card", () => {
    expect(checkProposal({ ...valid, service: "oil" }, { slugs, validateLead })).toEqual({
      ok: true,
      card: { service: null, name: "Ann", phone: "832-555-0100", email: "ann@example.com", vehicle: "2019 Civic", notes: "Squeal" },
    });
  });

  it("a placeholder email is missing, never shown on a card", () => {
    expect(checkProposal({ ...valid, email: "None" }, { slugs, validateLead })).toEqual({
      ok: false,
      note: expect.any(String),
      errors: { email: "Email is required" },
    });
  });

  it("a non-US or short phone fails with the endpoint's message", () => {
    expect(checkProposal({ ...valid, phone: "+34643847584" }, { slugs, validateLead }).errors).toEqual({
      phone: "Enter a 10-digit US phone number",
    });
    expect(checkProposal({ ...valid, phone: "555-0100" }, { slugs, validateLead }).errors).toEqual({
      phone: "Add the area code (281, 832, 346 or 713)",
    });
  });

  it("long notes are rejected like the request endpoint does", () => {
    expect(checkProposal({ ...valid, notes: "x".repeat(1001) }, { slugs, validateLead }).errors).toEqual({
      notes: "Use 1000 characters or fewer",
    });
  });
});
