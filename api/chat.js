import { createAi } from "../chat/server/ai.js";
import { createChatHandler } from "../chat/server/createChatHandler.js";
import { createTurnstile } from "../chat/server/turnstile.js";
import { chatServerSettings } from "../server/chatSettings.js";
import { getSql } from "../server/db/client.js";
import { createDb } from "../server/db/index.js";
import { createEmail } from "../server/email.js";

const unavailable = () => {
  throw new Error("DATABASE_URL is not set");
};
const noDb = new Proxy({}, { get: () => unavailable });

export async function POST(request) {
  const model = process.env.CHAT_MODEL;
  const handler = createChatHandler(chatServerSettings, {
    db: process.env.DATABASE_URL ? createDb(getSql()) : noDb,
    ai: createAi({
      apiKey: process.env.OPENAI_API_KEY,
      model,
      cacheKey: chatServerSettings.site,
      reasoningEffort: chatServerSettings.models[model]?.reasoningEffort,
    }),
    email: createEmail({
      apiKey: process.env.BREVO_API_KEY,
      to: process.env.LEAD_EMAIL_TO ?? "st.angeautos@gmail.com",
    }),
    turnstile: createTurnstile({ secret: process.env.TURNSTILE_SECRET_KEY }),
    ipSalt: process.env.IP_HASH_SALT,
    model,
  });
  return handler(request);
}
