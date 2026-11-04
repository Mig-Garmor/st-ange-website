export const chatState = (message) => message.parts?.find((part) => part.type === "data-chat-state")?.data?.state;

export const textOf = (message) =>
  (message.parts ?? [])
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");

// Any AI reply, or the limit notice, means the server has a verified conversation for this id.
export const isVerified = (list) =>
  list.some((m) => m.role === "assistant" && !["offline", "error"].includes(chatState(m)) && m.parts?.length);

// The server stores only the latest user text, so an unverified trailing message must be re-sent, not followed.
export const hasUnsentFirstMessage = (list) => !isVerified(list) && list.at(-1)?.role === "user";
