const SESSION_KEY = "chat:session";
const VISITOR_KEY = "chat:visitor";

const memory = { session: null, visitor: null };

const newId = () => {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
  }
};

export function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const session = JSON.parse(raw);
      if (typeof session?.id === "string" && Array.isArray(session.messages)) return session;
    }
  } catch {
  }
  return memory.session;
}

export function saveSession({ id, messages }) {
  memory.session = { id, messages };
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
