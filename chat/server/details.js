// Pulls the car and contact details a visitor already gave, so a continued chat can prefill the form without asking again.
const EMAIL = /[^\s@<>()]+@[^\s@<>()]+\.[a-z]{2,}/gi;
const PHONE = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g;
const VEHICLE = /\b((?:19|20)\d{2})\s+([A-Za-z][\w-]*)(?:\s+([A-Za-z0-9][\w-]*))?/g;
const NAME = /\bmy name is ([A-Za-z][\w'-]*(?:\s+[A-Z][\w'-]*)?)/gi;

const digits10 = (text) => {
  let d = String(text ?? "").replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  return d.length === 10 ? d : null;
};
const lastMatch = (text, pattern) => [...text.matchAll(pattern)].at(-1) ?? null;

export function extractDetails(userMessages = []) {
  const found = {};
  for (const message of userMessages) {
    const text = String(message ?? "");
    const email = lastMatch(text, EMAIL)?.[0].replace(/[.,;:!?]+$/, "");
    if (email) found.email = email;
    const phone = lastMatch(text, PHONE);
    if (phone && digits10(phone[0])) found.phone = digits10(phone[0]);
    const vehicle = lastMatch(text, VEHICLE);
    if (vehicle) {
      const model = vehicle[3] && /^[A-Z0-9]|\d/.test(vehicle[3]) ? ` ${vehicle[3]}` : "";
      found.vehicle = `${vehicle[1]} ${vehicle[2]}${model}`;
    }
    const name = lastMatch(text, NAME);
    if (name) found.name = name[1];
  }
  return found;
}

// A request the visitor sent is the most reliable source; their messages fill in whatever it lacks.
export const detailsFrom = ({ lead = {}, userMessages = [] }) => {
  const fromChat = extractDetails(userMessages);
  const pick = (field) => (lead?.[field] ? String(lead[field]) : fromChat[field]) || null;
  return { name: pick("name"), phone: digits10(pick("phone")), email: pick("email"), vehicle: pick("vehicle") };
};

// Never shows a full phone or email: the next person on a shared computer would see this prompt.
export function maskDetails({ vehicle, phone, email }) {
  const masked = {};
  if (vehicle) masked.vehicle = vehicle;
  if (phone) masked.phone = `ending ${phone.slice(-4)}`;
  if (email) {
    const [user, domain] = email.split("@");
    masked.email = `${user[0]}***@${domain}`;
  }
  return masked;
}
