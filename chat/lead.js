// One copy for the chat, the server and the website forms, so whatever one of them accepts the others accept too.
export const MAX_LENGTH = { name: 100, phone: 30, email: 200, vehicle: 100, notes: 1000 };

export function normalizePhone(input) {
  let digits = String(input ?? "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  return digits.length === 10 ? digits : null;
}

export const orList = (items) => (items.length > 1 ? `${items.slice(0, -1).join(", ")} or ${items.at(-1)}` : items.join(""));

export const formatPhone = (digits) => `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;

const EMAIL_DOMAINS = [
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "aol.com", "live.com", "msn.com",
  "me.com", "comcast.net", "att.net", "sbcglobal.net", "verizon.net", "protonmail.com",
];
const TLD_FIXES = { con: "com", cmo: "com", ocm: "com", vom: "com", xom: "com", comm: "com", cm: "com", nett: "net", ner: "net", ogr: "org" };

function editDistance(a, b) {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = current;
  }
  return previous[b.length];
}

// "Did you mean ann@gmail.com?" for a mistyped common domain or ending; null when it looks right or isn't finished.
// Offered, never forced: a real but unusual domain can always be kept.
export function suggestEmail(email) {
  const at = String(email ?? "").lastIndexOf("@");
  const local = email?.slice(0, at);
  const domain = String(email ?? "").slice(at + 1).toLowerCase();
  if (at < 1 || !domain.includes(".") || EMAIL_DOMAINS.includes(domain)) return null;

  // Fix the ending first (gmial.con → gmial.com), then compare with the common domains (→ gmail.com).
  const dot = domain.lastIndexOf(".");
  const fix = TLD_FIXES[domain.slice(dot + 1)];
  const fixed = fix ? domain.slice(0, dot + 1) + fix : domain;

  let best = null;
  for (const candidate of EMAIL_DOMAINS) {
    const distance = editDistance(fixed, candidate);
    if (distance <= (candidate.length > 7 ? 2 : 1) && (!best || distance < best.distance)) best = { candidate, distance };
  }
  const suggested = best?.candidate ?? fixed;
  return suggested === domain ? null : `${local}@${suggested}`;
}
