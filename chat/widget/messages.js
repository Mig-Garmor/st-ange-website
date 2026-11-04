export const chatState = (message) => message.parts?.find((part) => part.type === "data-chat-state")?.data?.state;

export const textOf = (message) =>
  (message.parts ?? [])
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");

export const isLocal = (message) => message.metadata?.local === true;

// Answered in the browser from settings; the server never sees or stores this pair.
export const localExchange = (question, answer, newId = () => crypto.randomUUID()) =>
  [
    ["user", question],
    ["assistant", answer],
  ].map(([role, text]) => ({ id: newId(), role, metadata: { local: true }, parts: [{ type: "text", text }] }));

// Any AI reply, or the limit notice, means the server has a verified conversation for this id.
export const isVerified = (list) =>
  list.some(
    (m) => m.role === "assistant" && !isLocal(m) && !["offline", "error"].includes(chatState(m)) && m.parts?.length,
  );

// The server stores only the latest user text, so an unverified trailing message must be re-sent, not followed.
export const hasUnsentFirstMessage = (list) => !isVerified(list) && list.at(-1)?.role === "user";
