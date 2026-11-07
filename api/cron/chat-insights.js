import { createInsightsJob } from "../../chat/server/createInsightsJob.js";
import { chatServerSettings } from "../../server/chatSettings.js";
import { ai, db, email, hasDb } from "../../server/services.js";

export async function GET(request) {
  if (!hasDb()) return Response.json({ skipped: "no database" });
  const model = process.env.CHAT_MODEL;
  const job = createInsightsJob(chatServerSettings, {
    db: db(),
    ai: ai(model),
    email: email(),
    model,
    cronSecret: process.env.CRON_SECRET,
  });
  return job(request);
}
