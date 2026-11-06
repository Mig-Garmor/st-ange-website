import { isSevenDigits, missingAreaCode, validateName, validateEmail } from "../src/modules/validate.js";
import { MAX_LENGTH, normalizePhone } from "../chat/lead.js";

const phoneError = (phone) => (isSevenDigits(phone) ? missingAreaCode() : "Enter a 10-digit US phone number");

export function validateLead({ name, phone, email, vehicle }, { requireVehicle = false, requireEmail = false } = {}) {
  const errors = {};
  const str = (v) => (typeof v === "string" ? v.trim() : "");
  const lead = { name: str(name), phone: normalizePhone(phone), email: str(email), vehicle: str(vehicle) };

  const nameError = validateName(lead.name);
  if (nameError) errors.name = nameError;
  if (String(phone ?? "").length > MAX_LENGTH.phone) errors.phone = `Use ${MAX_LENGTH.phone} characters or fewer`;
  else if (!lead.phone) errors.phone = phoneError(phone);
  if (lead.email || requireEmail) {
    const emailError = validateEmail(lead.email);
    if (emailError) errors.email = emailError;
  }
  if (requireVehicle && !lead.vehicle) errors.vehicle = "Vehicle is required";
  for (const field of ["name", "email", "vehicle"]) {
    if (lead[field].length > MAX_LENGTH[field]) errors[field] = `Use ${MAX_LENGTH[field]} characters or fewer`;
  }

  return { ok: Object.keys(errors).length === 0, errors, lead };
}
