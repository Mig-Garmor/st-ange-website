import { waitUntil } from "@vercel/functions";
import { createAi, reasoningEffortFor } from "../chat/server/ai.js";
import { createChatHandler } from "../chat/server/createChatHandler.js";
import { createTurnstile } from "../chat/server/turnstile.js";
import { chatServerSettings } from "../server/chatSettings.js";
import { getSql } from "../server/db/client.js";
import { createDb } from "../server/db/index.js";
import { createEmail } from "../server/email.js";
import { validateLead } from "../server/validate.js";

const unavailable = () => {
  throw new Error("DATABASE_URL is not set");
};
const noDb = new Proxy({}, { get: () => unavailable });

export async function POST(request) {
  const model = process.env.CHAT_MODEL;
  const handler = createChatHandler(chatServerSettings, {
    db: process.env.DATABASE_URL ? createDb(getSql()) : noDb,
    ai: createAi({
      apiKey: process.env.OPENROUTER_API_KEY,
      model,
      reasoningEffort: reasoningEffortFor(chatServerSettings, model),
    }),
    email: createEmail({
      apiKey: process.env.BREVO_API_KEY,
      to: process.env.LEAD_EMAIL_TO ?? "st.angeautos@gmail.com",
    }),
    turnstile: createTurnstile({
      secret: process.env.TURNSTILE_SECRET_KEY,
      hostnames: (process.env.TURNSTILE_HOSTNAMES ?? "").split(",").map((h) => h.trim()).filter(Boolean),
    }),
    ipSalt: process.env.IP_HASH_SALT,
    model,
    validateLead,
    waitUntil,
  });
  return handler(request);
}
