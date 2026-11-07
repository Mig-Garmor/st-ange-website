import { business } from "../config/business.js";
import { normalizePhone, orList } from "../../chat/lead.js";

export { MAX_LENGTH } from "../../chat/lead.js";


export const missingAreaCode = (codes = business.localAreaCodes) => `Add the area code (${orList(codes)})`;

export const isSevenDigits = (phone) => String(phone ?? "").replace(/\D/g, "").length === 7;

export function validateName(name) {
  return name.trim().length > 0 ? "" : "Name is required";
}

export function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email) ? "" : "Invalid email address";
}

export function validatePhone(phone) {
  if (isSevenDigits(phone)) return missingAreaCode();
  return normalizePhone(phone) ? "" : "Invalid phone number";
}

export function validateMessage(message) {
  return message.trim().length > 0 ? "" : "Message is required";
}
