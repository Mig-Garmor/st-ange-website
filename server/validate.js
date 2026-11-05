import { isSevenDigits, missingAreaCode, validateName, validateEmail } from "../src/modules/validate.js";
import { normalizePhone } from "./phone.js";

const MAX_LENGTH = { name: 100, vehicle: 100, email: 200 };
const MAX_PHONE = 30;

const phoneError = (phone) => (isSevenDigits(phone) ? missingAreaCode() : "Enter a 10-digit US phone number");

export function validateLead({ name, phone, email, vehicle }, { requireVehicle = false, requireEmail = false } = {}) {
  const errors = {};
  const str = (v) => (typeof v === "string" ? v.trim() : "");
  const lead = { name: str(name), phone: normalizePhone(phone), email: str(email), vehicle: str(vehicle) };

  const nameError = validateName(lead.name);
  if (nameError) errors.name = nameError;
  if (String(phone ?? "").length > MAX_PHONE) errors.phone = `Use ${MAX_PHONE} characters or fewer`;
  else if (!lead.phone) errors.phone = phoneError(phone);
  if (lead.email || requireEmail) {
    const emailError = validateEmail(lead.email);
    if (emailError) errors.email = emailError;
  }
  if (requireVehicle && !lead.vehicle) errors.vehicle = "Vehicle is required";
  for (const [field, max] of Object.entries(MAX_LENGTH)) {
    if (lead[field].length > max) errors[field] = `Use ${max} characters or fewer`;
  }

  return { ok: Object.keys(errors).length === 0, errors, lead };
}
