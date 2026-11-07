// Assistant lines in brackets are notes for transcripts; the model and the shop's email never see them as chat.
export const SENT_NOTE = "[Request sent to the shop]";
export const cardNote = (service) => `[Request card shown: ${service ?? "no service"}]`;

const assistantLine = (pattern) => (m) => m.role === "assistant" && pattern.test(m.content.trim());
export const isNote = assistantLine(/^\[[^\]]*\]$/);
export const isCardNote = assistantLine(/^\[Request card shown/);
export const isSentNote = assistantLine(/^\[Request sent/);
