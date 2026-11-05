import { createResumeHandler } from "../chat/server/createResumeHandler.js";
import { chatServerSettings } from "../server/chatSettings.js";
import { getSql } from "../server/db/client.js";
import { createDb } from "../server/db/index.js";

export async function POST(request) {
  if (!process.env.DATABASE_URL) return Response.json({ resume: null });
  return createResumeHandler(chatServerSettings, { db: createDb(getSql()) })(request);
}
