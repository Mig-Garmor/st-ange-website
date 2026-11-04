const PLACEHOLDER_EMAILS = new Set(["", "none", "n/a", "na", "no", "-", "null", "no email"]);
const MAX_NOTES = 1000;

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

export function checkProposal(input, { slugs, validateLead }) {
  const email = cleanEmail(input?.email);
  const notes = str(input?.notes);
  const { ok, errors, lead } = validateLead(
    { name: input?.name, phone: input?.phone, email: email ?? "", vehicle: input?.vehicle },
    { requireVehicle: true, requireEmail: true },
  );
  if (!email) errors.email = "Email is required";
  if (notes.length > MAX_NOTES) errors.notes = `Use ${MAX_NOTES} characters or fewer`;
  if (!ok || Object.keys(errors).length) return { ok: false, errors, note: "No card was shown. Ask the visitor to fix these fields." };
  return {
    ok: true,
    card: {
      service: cleanService(input?.service, slugs),
      name: lead.name,
      phone: formatPhone(lead.phone),
      email: lead.email,
      vehicle: lead.vehicle,
      notes,
    },
  };
}
