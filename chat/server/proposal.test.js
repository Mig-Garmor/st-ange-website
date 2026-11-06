import { describe, expect, it } from "vitest";
import { validateLead } from "../../server/validate.js";
import { checkProposal, cleanEmail, cleanService } from "./proposal.js";

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

  it("complete details open the form ready to send, normalised", () => {
    expect(checkProposal({ ...valid, service: "oil" }, { slugs, validateLead })).toEqual({
      ok: true,
      card: { service: null, name: "Ann", phone: "832-555-0100", email: "ann@example.com", vehicle: "2019 Civic", notes: "Squeal" },
      note: "The visitor now sees the form with everything filled in, ready to check and send.",
    });
  });

  it("no details still opens the form, and the note tells the model not to ask for them in chat", () => {
    const result = checkProposal({ service: "brakes", notes: "Squeal" }, { slugs, validateLead });
    expect(result.ok).toBe(true);
    expect(result.card).toEqual({ service: "brakes", name: "", phone: "", email: "", vehicle: "", notes: "Squeal" });
    expect(result.note).toBe("The visitor now sees a 3-step form that asks for name, phone, email, vehicle. Do not ask for them in the chat.");
  });

  it("a placeholder email is left empty for the form to ask, never shown as given", () => {
    const result = checkProposal({ ...valid, email: "None" }, { slugs, validateLead });
    expect(result.card.email).toBe("");
    expect(result.note).toContain("asks for email");
  });

  it("an invalid phone is kept as typed so the form's phone step can flag it", () => {
    expect(checkProposal({ ...valid, phone: "555-0100" }, { slugs, validateLead }).card.phone).toBe("555-0100");
    expect(checkProposal({ ...valid, phone: "+34643847584" }, { slugs, validateLead }).note).toContain("asks for phone");
  });

  it("known details from a continued chat fill only what this chat did not give", () => {
    const known = { name: "Dana", phone: "2815550166", email: "dana@mailinator.com", vehicle: "2015 Ford F-150" };
    const { card } = checkProposal({ service: "brakes", vehicle: "2019 Civic" }, { slugs, validateLead, known });
    expect(card).toEqual({ service: "brakes", name: "Dana", phone: "281-555-0166", email: "dana@mailinator.com", vehicle: "2019 Civic", notes: "" });
  });

  it("over-long values are cut to the endpoint's limits instead of failing", () => {
    const { card } = checkProposal({ ...valid, notes: "x".repeat(1500), name: "n".repeat(150) }, { slugs, validateLead });
    expect(card.notes).toHaveLength(1000);
    expect(card.name).toHaveLength(100);
  });
});
