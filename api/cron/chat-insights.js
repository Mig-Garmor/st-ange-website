import { createAi, providerOrderFor, reasoningEffortFor } from "../../chat/server/ai.js";
import { createInsightsJob } from "../../chat/server/createInsightsJob.js";
import { chatServerSettings } from "../../server/chatSettings.js";
import { getSql } from "../../server/db/client.js";
import { createDb } from "../../server/db/index.js";
import { createEmail } from "../../server/email.js";

export async function GET(request) {
  if (!process.env.DATABASE_URL) return Response.json({ skipped: "no database" });
  const model = process.env.CHAT_MODEL;
  const job = createInsightsJob(chatServerSettings, {
    db: createDb(getSql()),
    ai: createAi({
      apiKey: process.env.OPENROUTER_API_KEY,
      model,
      reasoningEffort: reasoningEffortFor(chatServerSettings, model),
      zdr: chatServerSettings.zdr,
      providerOrder: providerOrderFor(chatServerSettings, model),
    }),
    email: createEmail({
      apiKey: process.env.BREVO_API_KEY,
      to: process.env.LEAD_EMAIL_TO ?? "st.angeautos@gmail.com",
    }),
    model,
    cronSecret: process.env.CRON_SECRET,
  });
  return job(request);
}
