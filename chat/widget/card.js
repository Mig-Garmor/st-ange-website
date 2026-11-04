export const FIELDS = ["service", "name", "phone", "email", "vehicle", "notes"];

const str = (v) => (typeof v === "string" ? v : "");
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const okCard = (part) =>
  part?.type === "tool-proposeRequest" && part.state === "output-available" && part.output?.ok === true
    ? part.output.card ?? null
    : null;

// Only the newest valid card can be sent; an older one may hold details the visitor has since corrected.
export const latestCardId = (messages) =>
  messages
    .flatMap((message) => message.parts ?? [])
    .filter((part) => okCard(part))
    .at(-1)?.toolCallId ?? null;

const orList = (items) => (items.length > 1 ? `${items.slice(0, -1).join(", ")} or ${items.at(-1)}` : items.join(""));

export const initialForm = (card) => Object.fromEntries(FIELDS.map((f) => [f, str(card?.[f])]));

// Mirrors the server rules so an edit is flagged before sending; /api/chat-request still decides.
export function fieldError(field, value, { localAreaCodes = [] } = {}) {
  const v = str(value).trim();
  if (field === "name") return v ? "" : "Name is required";
  if (field === "vehicle") return v ? "" : "Vehicle is required";
  if (field === "email") return !v ? "Email is required" : EMAIL.test(v) ? "" : "Invalid email address";
  if (field === "phone") {
    let digits = v.replace(/\D/g, "");
    if (digits.length === 7 && localAreaCodes.length) return `Add the area code (${orList(localAreaCodes)})`;
    if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
    return digits.length === 10 ? "" : "Enter a 10-digit US phone number";
  }
  return "";
}
