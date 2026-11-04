import { validateName, validateEmail } from "../src/modules/validate.js";
import { normalizePhone } from "./phone.js";

export function validateLead({ name, phone, email, vehicle }, { requireVehicle = false, requireEmail = false } = {}) {
  const errors = {};
  const str = (v) => (typeof v === "string" ? v.trim() : "");
  const lead = { name: str(name), phone: normalizePhone(phone), email: str(email), vehicle: str(vehicle) };

  const nameError = validateName(lead.name);
  if (nameError) errors.name = nameError;
  if (!lead.phone) errors.phone = "Enter a 10-digit US phone number";
  if (lead.email || requireEmail) {
    const emailError = validateEmail(lead.email);
    if (emailError) errors.email = emailError;
  }
  if (requireVehicle && !lead.vehicle) errors.vehicle = "Vehicle is required";

  return { ok: Object.keys(errors).length === 0, errors, lead };
}
