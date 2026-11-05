const MAX = 600;

const oneLine = (text) => String(text ?? "").replace(/\s+/g, " ").trim();
// Keeps the newest words when it has to cut, since the latest messages say what the visitor still needs.
const clip = (text, max) => (text.length > max ? `…${text.slice(-(max - 1))}` : text);

// Context for a new chat from the visitor's earlier one only, never further back: chaining mixed separate problems together.
// Its summary if the insight job wrote one, else the visitor's last few messages.
export function buildCarryOver({ summary, userMessages = [] }, max = MAX) {
  if (oneLine(summary)) return clip(oneLine(summary), max);
  const text = userMessages.slice(-6).map(oneLine).filter(Boolean).join(" / ");
  return text ? clip(text, max) : null;
}

// The model sees the last `window` stored messages; this keeps what the visitor said before that, in short.
export function olderInChat(stored, window, max = MAX) {
  const older = stored.slice(0, Math.max(0, stored.length - window)).filter((m) => m.role === "user").map((m) => oneLine(m.content));
  return older.length ? clip(older.filter(Boolean).join(" / "), max) : null;
}
