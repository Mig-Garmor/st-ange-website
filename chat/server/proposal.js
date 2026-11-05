const PLACEHOLDER_EMAILS = new Set(["", "none", "n/a", "na", "no", "-", "null", "no email"]);
const MAX = { name: 100, vehicle: 100, email: 200, phone: 30, notes: 1000 };

const str = (v) => (typeof v === "string" ? v.trim() : "");

export const cleanEmail = (value) => {
  const email = str(value);
  return PLACEHOLDER_EMAILS.has(email.toLowerCase()) ? null : email;
};

export const cleanService = (value, slugs) => {
  const slug = str(value).toLowerCase();
  return slugs.includes(slug) ? slug : null;
};

export const formatPhone = (digits) => `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;

// The card collects missing or invalid details in steps, so anything known is a usable prefill, never a refusal.
export function checkProposal(input, { slugs, validateLead }) {
  const raw = Object.fromEntries(Object.keys(MAX).map((field) => [field, str(input?.[field]).slice(0, MAX[field])]));
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
