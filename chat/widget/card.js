import { formatPhone, normalizePhone } from "../lead.js";

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

export function displayPhone(value) {
  const digits = normalizePhone(value);
  return digits ? formatPhone(digits) : str(value);
}

export const initialForm = (card) => Object.fromEntries(FIELDS.map((f) => [f, str(card?.[f])]));

// Mirrors the server rules so an edit is flagged before sending; /api/chat-request still decides.
export function fieldError(field, value, { localAreaCodes = [] } = {}) {
  const v = str(value).trim();
  if (field === "name") return v ? "" : "Name is required";
  if (field === "vehicle") return v ? "" : "Vehicle is required";
  if (field === "email") return !v ? "Email is required" : EMAIL.test(v) ? "" : "Invalid email address";
  if (field === "phone") {
    if (normalizePhone(v)) return "";
    if (v.replace(/\D/g, "").length === 7 && localAreaCodes.length) return `Add the area code (${orList(localAreaCodes)})`;
    return "Enter a 10-digit US phone number";
  }
  return "";
}

const DRAFT_KEY = (conversationId) => `chat:request-draft:${conversationId}`;

// What the visitor typed into a form survives the form being reopened further down, or a reload.
export function loadDraft(conversationId) {
  try {
    return JSON.parse(sessionStorage.getItem(DRAFT_KEY(conversationId)) ?? "null") ?? {};
  } catch {
    return {};
  }
}

export function saveDraft(conversationId, form) {
  try {
    sessionStorage.setItem(DRAFT_KEY(conversationId), JSON.stringify(form));
  } catch {
  }
}

export function clearDraft(conversationId) {
  try {
    sessionStorage.removeItem(DRAFT_KEY(conversationId));
  } catch {
  }
}

// The visitor's own typing beats the bot's prefill; the prefill fills whatever they left empty.
export const mergeDraft = (form, draft) =>
  Object.fromEntries(FIELDS.map((f) => [f, str(draft?.[f]).trim() ? str(draft[f]) : form[f]]));

export const STEPS = [
  { title: "Your car", fields: ["service", "vehicle", "notes"] },
  { title: "How we reach you", fields: ["name", "phone"] },
  { title: "Almost done", fields: ["email"] },
];

export const stepErrors = (form, step, options) =>
  Object.fromEntries(STEPS[step].fields.map((f) => [f, fieldError(f, form[f], options)]).filter(([, e]) => e));

// A prefilled card skips straight to the first step that still needs something, or to the last step to review and send.
export function firstIncompleteStep(form, options) {
  const index = STEPS.findIndex((_, step) => Object.keys(stepErrors(form, step, options)).length);
  return index === -1 ? STEPS.length - 1 : index;
}
