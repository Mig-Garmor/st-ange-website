import { z } from "zod";
import { assertPriced, isAvailable, recordUsage } from "./limits.js";

const BATCH = 50;
const UNREADABLE = { outcome: "abandoned" };

export const insightsSchema = (serviceSlugs) =>
  z.object({
    summary: z.string().max(300),
    services: z.array(z.enum(serviceSlugs)),
    intent: z.enum(["question", "quote", "booking", "complaint", "other"]),
    unanswered: z.array(z.string()),
    outcome: z.enum(["request_sent", "info_only", "abandoned"]),
  });

const instructions = (knowledge) => `You analyse finished website chats between a visitor and a business's chat assistant, and fill in a structured record.

- Summarise the chat in two sentences.
- List only the visitor's questions that the knowledge below did not answer.
- Use request_sent only when the transcript contains [Request sent to the shop]; use abandoned when the visitor left without getting what they came for, otherwise info_only.

${knowledge}`;

export function createInsightsJob(settings, { db, ai, email, model, cronSecret, now = () => new Date() }) {
  const schema = insightsSchema(settings.services.map((s) => s.slug));
  const system = instructions(settings.knowledge);

  return async function handler(request) {
    if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    try {
      assertPriced(settings, model);
    } catch (error) {
      console.error("Insight job cannot price its model", error);
      return Response.json({ error: error.message }, { status: 500 });
    }
    if (!(await isAvailable({ db, settings, now: now() }))) return Response.json({ skipped: "offline" });

    const claimed = await db.claimForInsights(settings.site, BATCH);
    let processed = 0;
    let failed = 0;
    for (const { id, transcript } of claimed) {
      if (!(await isAvailable({ db, settings, now: now() }))) break;
      try {
        const { object, usage } = await ai.generateInsights({ system, transcript, schema });
        await recordUsage({ db, email, settings, model, usage, now: now() }).catch((error) =>
          console.error("Insight usage not recorded", error),
        );
        if (object) {
          await db.saveInsights(id, object);
          processed += 1;
        } else {
          console.error("Insight output failed the schema; marking the conversation done", id);
          await db.saveInsights(id, UNREADABLE);
          failed += 1;
        }
      } catch (error) {
        failed += 1;
        console.error("Insight job failed for a conversation", id, error);
      }
    }
    return Response.json({ processed, failed });
  };
}
