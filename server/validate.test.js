import { describe, expect, it } from "vitest";
import { validateLead } from "./validate.js";

const lead = { name: "Ann", phone: "832-555-0100", email: "", vehicle: "Civic" };

describe("validateLead phone errors", () => {
  it("names the missing area code for a 7-digit number", () => {
    expect(validateLead({ ...lead, phone: "555-0100" }).errors.phone).toBe("Add the area code (281, 832, 346 or 713)");
  });

  it("keeps the general message for other invalid numbers", () => {
    for (const phone of ["+34643847584", "12345", ""]) {
      expect(validateLead({ ...lead, phone }).errors.phone).toBe("Enter a 10-digit US phone number");
    }
  });

  it("accepts a 10-digit or +1 number, and email stays optional unless required", () => {
    expect(validateLead({ ...lead, phone: "+1 (832) 555-0100" })).toMatchObject({ ok: true, lead: { phone: "8325550100" } });
    expect(validateLead(lead, { requireEmail: true }).errors).toEqual({ email: "Invalid email address" });
  });
});
