import { createInsightsJob } from "../../chat/server/createInsightsJob.js";
import { chatServerSettings } from "../../server/chatSettings.js";
import { chatForwarder } from "../../server/hub.js";
import { ai, db, email, hasDb, hub } from "../../server/services.js";

export async function GET(request) {
  if (!hasDb()) return Response.json({ skipped: "no database" });
  const model = process.env.CHAT_MODEL;
  const store = db();
  const forwardTo = hub();
  const job = createInsightsJob(chatServerSettings, {
    db: store,
    ai: ai(model),
    email: email(),
    model,
    cronSecret: process.env.CRON_SECRET,
    ...(forwardTo && { forward: chatForwarder({ db: store, hub: forwardTo }) }),
  });
  return job(request);
}
