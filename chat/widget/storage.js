const SESSION_KEY = "chat:session";
const VISITOR_KEY = "chat:visitor";

// Matches the insight job's one hour of quiet, so a chat that may already be summarised is never continued.
export const SESSION_TTL_MS = 60 * 60 * 1000;

export const isExpired = (savedAt, now = Date.now()) => !(now - savedAt < SESSION_TTL_MS);

const memory = { session: null, visitor: null };

const newId = () => {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
  }
};

export function loadSession(now = Date.now()) {
  let session = memory.session;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) session = JSON.parse(raw);
  } catch {
  }
  const valid = typeof session?.id === "string" && Array.isArray(session.messages) && !isExpired(session.savedAt, now);
  return valid ? session : null;
}

export function saveSession({ id, messages }, now = Date.now()) {
  memory.session = { id, messages, savedAt: now };
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(memory.session));
  } catch {
  }
}

export function visitorId() {
  try {
    const stored = localStorage.getItem(VISITOR_KEY);
    if (stored) return stored;
  } catch {
  }
  memory.visitor ??= newId();
  try {
    localStorage.setItem(VISITOR_KEY, memory.visitor);
  } catch {
  }
  return memory.visitor;
}
