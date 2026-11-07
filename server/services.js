import { createAi, providerOrderFor, reasoningEffortFor } from "../chat/server/ai.js";
import { createTurnstile } from "../chat/server/turnstile.js";
import { business } from "../src/config/business.js";
import { chatServerSettings } from "./chatSettings.js";
import { getSql } from "./db/client.js";
import { createDb } from "./db/index.js";
import { createEmail } from "./email.js";

// The services every api/ route builds from env vars, set up one way.
const unavailable = () => {
  throw new Error("DATABASE_URL is not set");
};
const noDb = new Proxy({}, { get: () => unavailable });

export const hasDb = () => Boolean(process.env.DATABASE_URL);
export const db = () => (hasDb() ? createDb(getSql()) : noDb);

export const email = () =>
  createEmail({ apiKey: process.env.BREVO_API_KEY, to: process.env.LEAD_EMAIL_TO ?? business.email });

export const ai = (model) =>
  createAi({
    apiKey: process.env.OPENROUTER_API_KEY,
    model,
    reasoningEffort: reasoningEffortFor(chatServerSettings, model),
    zdr: chatServerSettings.zdr,
    providerOrder: providerOrderFor(chatServerSettings, model),
  });

export const turnstile = () =>
  createTurnstile({
    secret: process.env.TURNSTILE_SECRET_KEY,
    hostnames: (process.env.TURNSTILE_HOSTNAMES ?? "").split(",").map((h) => h.trim()).filter(Boolean),
  });
