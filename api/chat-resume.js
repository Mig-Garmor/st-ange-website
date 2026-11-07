import { createResumeHandler } from "../chat/server/createResumeHandler.js";
import { chatServerSettings } from "../server/chatSettings.js";
import { db, hasDb } from "../server/services.js";

export async function POST(request) {
  if (!hasDb()) return Response.json({ resume: null });
  return createResumeHandler(chatServerSettings, { db: db() })(request);
}
