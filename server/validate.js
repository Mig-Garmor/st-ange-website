import { validateName, validateEmail } from "../src/modules/validate.js";
import { localAreaCodes } from "./chatSettings.js";
import { normalizePhone } from "./phone.js";

const MAX_LENGTH = { name: 100, vehicle: 100, email: 200 };

const orList = (items) => (items.length > 1 ? `${items.slice(0, -1).join(", ")} or ${items.at(-1)}` : items.join(""));

const phoneError = (phone) =>
  String(phone ?? "").replace(/\D/g, "").length === 7
    ? `Add the area code (${orList(localAreaCodes)})`
    : "Enter a 10-digit US phone number";

export function validateLead({ name, phone, email, vehicle }, { requireVehicle = false, requireEmail = false } = {}) {
  const errors = {};
  const str = (v) => (typeof v === "string" ? v.trim() : "");
  const lead = { name: str(name), phone: normalizePhone(phone), email: str(email), vehicle: str(vehicle) };

  const nameError = validateName(lead.name);
  if (nameError) errors.name = nameError;
  if (!lead.phone) errors.phone = phoneError(phone);
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
