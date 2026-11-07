import { MAX_LENGTH, formatPhone } from "../lead.js";
import { str } from "./input.js";

const PLACEHOLDER_EMAILS = new Set(["", "none", "n/a", "na", "no", "-", "null", "no email"]);

export const cleanEmail = (value) => {
  const email = str(value);
  return PLACEHOLDER_EMAILS.has(email.toLowerCase()) ? null : email;
};

export const cleanService = (value, slugs) => {
  const slug = str(value).toLowerCase();
  return slugs.includes(slug) ? slug : null;
};

// The card collects missing or invalid details in steps, so anything known is a usable prefill, never a refusal.
// known: details the visitor gave in an earlier chat they chose to continue; anything said in this chat wins.
export function checkProposal(input, { slugs, validateLead, known = null }) {
  const raw = Object.fromEntries(
    Object.keys(MAX_LENGTH).map((field) => [field, (str(input?.[field]) || str(known?.[field])).slice(0, MAX_LENGTH[field])]),
  );
  const email = cleanEmail(raw.email) ?? "";
  const { lead } = validateLead({ name: raw.name, phone: raw.phone, email, vehicle: raw.vehicle });
  const missing = ["name", "phone", "email", "vehicle"].filter((field) => !(field === "phone" ? lead.phone : field === "email" ? email : raw[field]));
  return {
    ok: true,
    card: {
      service: cleanService(input?.service, slugs),
      name: raw.name,
      phone: lead.phone ? formatPhone(lead.phone) : raw.phone,
      email,
      vehicle: raw.vehicle,
      notes: raw.notes,
    },
    note: missing.length
      ? `The visitor now sees a 3-step form that asks for ${missing.join(", ")}. Do not ask for them in the chat.`
      : "The visitor now sees the form with everything filled in, ready to check and send.",
  };
}
