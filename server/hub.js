import { isNote } from "../chat/server/notes.js";

// Copy of createHub from Website Hub's SDK (@website-hub/sdk 0.1.0, packages/sdk/src/server.ts).
// shortcut: copied because the SDK is not on npm yet; once it is, install it and import createHub from "@website-hub/sdk/server".
export function createHub({ secret, endpoint, fetch = globalThis.fetch, timeoutMs = 5000 }) {
  const base = String(endpoint ?? "").replace(/\/+$/, "");

  async function post(path, body) {
    try {
      const response = await fetch(`${base}${path}`, {
        method: "POST",
        headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) return { ok: true, data };
      return { ok: false, error: typeof data?.error === "string" ? data.error : `http_${response.status}`, status: response.status };
    } catch (error) {
      if (error instanceof DOMException && error.name === "TimeoutError") return { ok: false, error: "timeout" };
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  return {
    requests: { submit: (input) => post("/api/v1/requests", input) },
    conversations: { push: (input) => post("/api/v1/conversations", input) },
  };
}

const MAX_CONTENT = 4000;

// The hub rejects empty strings (an empty email is not an email), so blank fields and empty objects are left out.
const compact = (object) => {
  const kept = Object.fromEntries(Object.entries(object).filter(([, v]) => v !== null && v !== undefined && v !== ""));
  return Object.keys(kept).length ? kept : undefined;
};
const contact = (lead = {}) => compact({ name: lead.name, phone: lead.phone, email: lead.email });

export const hubRequest = ({ source, service, idempotencyKey, lead, message, vehicle, pageUrl, consentText }, now = new Date()) =>
  compact({
    idempotencyKey,
    source,
    service,
    contact: contact(lead),
    message,
    details: compact({ vehicle }),
    pagePath: pageUrl,
    consentText,
    consentAt: consentText ? now.toISOString() : null,
  });

// Notes like "[Request sent to the shop]" mark the transcript for staff; the hub gets only what was said.
export function hubConversation(chat) {
  const messages = (chat?.messages ?? [])
    .filter((m) => !isNote(m))
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CONTENT), at: m.at.toISOString() }));
  if (!messages.length) return null;
  return compact({
    id: chat.id,
    startedAt: chat.startedAt.toISOString(),
    pagePath: chat.pagePath,
    contact: contact(chat.lead),
    messages,
    insights: compact(chat.insights),
  });
}

// For the insights job: sends one finished chat to the hub. Never throws; a failed forward is logged, not retried.
export const chatForwarder = ({ db, hub, logger = console }) =>
  async function forward(id) {
    try {
      const chat = hubConversation(await db.conversationForHub(id));
      if (!chat) return;
      const result = await hub.conversations.push(chat);
      if (!result.ok) logger.error("Hub chat not forwarded", id, result.error);
    } catch (error) {
      logger.error("Hub chat not forwarded", id, error);
    }
  };
