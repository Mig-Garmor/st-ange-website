import { waitUntil } from "@vercel/functions";
import { createChatHandler } from "../chat/server/createChatHandler.js";
import { chatServerSettings } from "../server/chatSettings.js";
import { ai, db, email, turnstile } from "../server/services.js";
import { validateLead } from "../server/validate.js";

export async function POST(request) {
  const model = process.env.CHAT_MODEL;
  const handler = createChatHandler(chatServerSettings, {
    db: db(),
    ai: ai(model),
    email: email(),
    turnstile: turnstile(),
    ipSalt: process.env.IP_HASH_SALT,
    model,
    validateLead,
    waitUntil,
  });
  return handler(request);
}
