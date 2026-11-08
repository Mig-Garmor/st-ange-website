import { z } from "zod";
import { assertPriced, isAvailable, recordUsage } from "./limits.js";

const BATCH = 50;
const MAX_UNANSWERED = 10;
const MAX_QUESTION = 200;
const UNREADABLE = { outcome: "abandoned" };

export const insightsSchema = (serviceSlugs) =>
  z.object({
    summary: z.string().max(300),
    services: z.array(z.enum(serviceSlugs)),
    intent: z.enum(["question", "quote", "booking", "complaint", "other"]),
    unanswered: z.array(z.string()),
    outcome: z.enum(["info_only", "abandoned"]),
  });

const instructions = (knowledge, services) => `You analyse finished website chats between a visitor and a business's chat assistant, and fill in a structured record.

- Summarise the chat in two sentences. Never use he, him, his, she or her for the visitor: repeat their name, write "the visitor", or use "they" and "their".
- services: every service the visitor asked about or wanted, using these slugs: ${services}.
- intent: booking when they want work done or a callback, quote when they ask what something costs, question when they only want information, complaint when they are unhappy with past work, other only when none of these fit.
- List only the visitor's questions that the knowledge below did not answer.
- outcome: abandoned when the visitor left without getting what they came for, otherwise info_only.

${knowledge}`;

export function createInsightsJob(settings, { db, ai, email, model, cronSecret, forward = async () => {}, now = () => new Date() }) {
  const schema = insightsSchema(settings.services.map((s) => s.slug));
  const system = instructions(
    settings.knowledge,
    settings.services.map((s) => `${s.slug} (${s.name})`).join(", "),
  );

  // A chat is finished once it has insights, so that is when the hub gets its copy (forward never throws).
  return async function handler(request) {
    if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    // The hashes only serve the one-hour rate limits; dropping them keeps old rows unlinkable.
    const { ipHashDays, chatMonths, leadYears } = settings.retention;
    await db.forgetIpHashes(ipHashDays).catch((error) => console.error("Forgetting IP hashes failed", error));
    await db.purgeExpired({ site: settings.site, chatMonths, leadYears }).catch((error) => console.error("Retention purge failed", error));
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
    for (const { id, transcript, requestSent } of claimed) {
      if (!(await isAvailable({ db, settings, now: now() }))) break;
      try {
        const { object, usage } = await ai.generateInsights({ system, transcript, schema });
        await recordUsage({ db, email, settings, model, usage, now: now() }).catch((error) =>
          console.error("Insight usage not recorded", error),
        );
        if (object) {
          // Visitors can steer these fields, so they are bounded here rather than trusted.
          const unanswered = object.unanswered.slice(0, MAX_UNANSWERED).map((q) => q.slice(0, MAX_QUESTION));
          await db.saveInsights(id, { ...object, unanswered, ...(requestSent && { outcome: "request_sent" }) });
          await forward(id);
          processed += 1;
        } else {
          console.error("Insight output failed the schema; marking the conversation done", id);
          await db.saveInsights(id, requestSent ? { outcome: "request_sent" } : UNREADABLE);
          await forward(id);
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
