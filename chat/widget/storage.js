const SESSION_KEY = "chat:session";
const VISITOR_KEY = "chat:visitor";
const LAST_CHAT_KEY = "chat:last";

// The server only accepts an earlier chat active within this window; checked here too so a stale id is never sent.
export const CARRY_TTL_MS = 24 * 60 * 60 * 1000;

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

export function saveSession({ id, messages, previousId = null }, now = Date.now()) {
  memory.session = { id, messages, previousId, savedAt: now };
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(memory.session));
  } catch {
  }
}

// Kept in localStorage, unlike the chat itself, so a visitor back in a new tab tomorrow still continues.
export function rememberChat(id, now = Date.now()) {
  try {
    localStorage.setItem(LAST_CHAT_KEY, JSON.stringify({ id, at: now }));
  } catch {
  }
}

export function forgetChat() {
  try {
    localStorage.removeItem(LAST_CHAT_KEY);
  } catch {
  }
}

// A stale pointer is deleted, not just ignored, so nothing about an old chat lingers past the window.
export function recentChatId(now = Date.now()) {
  try {
    const last = JSON.parse(localStorage.getItem(LAST_CHAT_KEY) ?? "null");
    if (typeof last?.id === "string" && now - last.at < CARRY_TTL_MS) return last.id;
    if (last) forgetChat();
    return null;
  } catch {
    return null;
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
