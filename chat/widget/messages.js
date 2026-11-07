import { okCard } from "./card.js";

const stateData = (message) => message.parts?.find((part) => part.type === "data-chat-state")?.data;
export const chatState = (message) => stateData(message)?.state;
export const chatReason = (message) => stateData(message)?.reason;

export const textOf = (message) =>
  (message.parts ?? [])
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");

// The model writes its line after the tool runs; shown above the form, it introduces it instead of trailing it.
export const displayParts = (message) => {
  const parts = message.parts ?? [];
  if (!parts.some((part) => okCard(part))) return parts;
  return [...parts.filter((part) => part.type === "text"), ...parts.filter((part) => part.type !== "text")];
};

export const isLocal = (message) => message.metadata?.local === true;

// Answered in the browser from settings; the server never stores this pair.
export const localExchange = (question, answer, newId = () => crypto.randomUUID()) =>
  [
    ["user", question],
    ["assistant", answer],
  ].map(([role, text]) => ({ id: newId(), role, metadata: { local: true }, parts: [{ type: "text", text }] }));

// Matches the server's limits.maxChars: a burst of quick messages goes out as one turn, joined by line breaks.
export const MAX_TURN_CHARS = 1000;

// Takes as many queued messages as fit in one turn; the rest wait for the next reply to finish.
export function nextBurst(queue, max = MAX_TURN_CHARS) {
  const burst = [];
  let length = 0;
  for (const text of queue) {
    const added = (burst.length ? 1 : 0) + text.length;
    if (burst.length && length + added > max) break;
    burst.push(text);
    length += added;
  }
  return { burst, rest: queue.slice(burst.length) };
}

export const SENT_FOLLOW_UP = "Thanks, we got your request and we'll be in touch shortly. Can I help with anything else?";

// Keyed by the card, so sending twice or reloading never adds a second note.
export const SENT_CLOSED = "Thanks, we got your request and we'll be in touch shortly.";

export const sentNote = (toolCallId, list, text = SENT_FOLLOW_UP) =>
  list.some((m) => m.id === `sent-${toolCallId}`)
    ? list
    : [...list, { id: `sent-${toolCallId}`, role: "assistant", metadata: { local: true }, parts: [{ type: "text", text }] }];

// Opens the request form without the model, for when the chat itself can no longer reply.
export const localForm = (id = crypto.randomUUID()) => ({
  id: `form-${id}`,
  role: "assistant",
  metadata: { local: true },
  parts: [{ type: "tool-proposeRequest", toolCallId: `local-${id}`, state: "output-available", input: {}, output: { ok: true, card: {} } }],
});

// Local messages (a form opened here, the sent note) don't lift a limit the server set.
export const serverState = (list) => chatState(list.findLast((m) => !isLocal(m)) ?? {});

// A message that is only too long can be shortened and resent; every other limit stops the chat.
export const blocksChat = (list) => {
  const last = list.findLast((m) => !isLocal(m)) ?? {};
  const state = chatState(last);
  return state === "offline" || (state === "limit" && chatReason(last) !== "too_long");
};

// Any AI reply, or the limit notice, means the server has a verified conversation for this id.
export const isVerified = (list) =>
  list.some(
    (m) => m.role === "assistant" && !isLocal(m) && !["offline", "error"].includes(chatState(m)) && m.parts?.length,
  );

const CLAIMS_CARD = /tap (the )?send request|send request (button|below)|(the |in the |this )form\b/i;
const hasCard = (message) => (message.parts ?? []).some((part) => okCard(part));

const hasVisibleReply = (message, earlierCard) => {
  if (chatState(message) || hasCard(message)) return true;
  const text = textOf(message).trim();
  // A reply pointing at a card that never rendered is a dead end, unless an earlier card is still on screen.
  return Boolean(text) && (earlierCard || !CLAIMS_CARD.test(text));
};

// A model can end a turn with no text and no usable card; without this the visitor sees silence.
export const lastReplyMissing = (list) => {
  const last = list.at(-1);
  if (!last || !isVerified(list)) return false;
  return last.role === "user" || !hasVisibleReply(last, list.slice(0, -1).some(hasCard));
};

// The server stores only the latest user text, so an unverified trailing message must be re-sent, not followed.
export const hasUnsentFirstMessage = (list) => !isVerified(list) && list.at(-1)?.role === "user";

// A 403 or failed challenge before the server first replied means the chat never started;
// once it had replied, the last message is resent in a fresh conversation.
export function afterVerifyError(err, list) {
  const challengeFailed = err && !err.statusCode && err.message?.startsWith("Turnstile");
  if (err?.statusCode !== 403 && !challengeFailed) return { verifyFailed: false };
  if (!isVerified(list.slice(0, -1))) return { verifyFailed: true };
  return { resend: (list.at(-1)?.parts ?? []).filter((p) => p.type === "text").map((p) => p.text) };
}
