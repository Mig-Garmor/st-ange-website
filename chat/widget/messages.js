import { okCard } from "./card.js";

export const chatState = (message) => message.parts?.find((part) => part.type === "data-chat-state")?.data?.state;

export const textOf = (message) =>
  (message.parts ?? [])
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");

export const isLocal = (message) => message.metadata?.local === true;

// Answered in the browser from settings; the server never stores this pair.
export const localExchange = (question, answer, newId = () => crypto.randomUUID()) =>
  [
    ["user", question],
    ["assistant", answer],
  ].map(([role, text]) => ({ id: newId(), role, metadata: { local: true }, parts: [{ type: "text", text }] }));

export const SENT_FOLLOW_UP = "Thanks, we got your request and we'll be in touch shortly. Can I help with anything else?";

// Keyed by the card, so sending twice or reloading never adds a second note.
export const sentNote = (toolCallId, list) =>
  list.some((m) => m.id === `sent-${toolCallId}`)
    ? list
    : [...list, { id: `sent-${toolCallId}`, role: "assistant", metadata: { local: true }, parts: [{ type: "text", text: SENT_FOLLOW_UP }] }];

// Any AI reply, or the limit notice, means the server has a verified conversation for this id.
export const isVerified = (list) =>
  list.some(
    (m) => m.role === "assistant" && !isLocal(m) && !["offline", "error"].includes(chatState(m)) && m.parts?.length,
  );

const CLAIMS_CARD = /tap (the )?send request|send request (button|below)|(the |in the )form below/i;
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
