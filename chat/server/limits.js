import { costEur, normaliseUsage } from "./cost.js";

export function chicagoDay(now, timeZone) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

const sinceResume = (total, state, today, timeZone) =>
  state.resumedAt && chicagoDay(new Date(state.resumedAt), timeZone) === today ? total - (state.resumeCostEur ?? 0) : total;

export async function isAvailable({ db, settings, now }) {
  const state = await db.getChatState(settings.site);
  if (state.status === "paused") return false;
  const today = chicagoDay(now, settings.timeZone);
  const { costEur: total } = await db.getUsage(settings.site, today);
  return sinceResume(total, state, today, settings.timeZone) < settings.dailyCapEur;
}

export const resumeSql = (site, timeZone) =>
  `UPDATE chat_state SET status='active', resumed_at=now(), resume_cost_eur=(SELECT coalesce(sum(cost_eur),0) FROM ai_usage_daily WHERE site='${site}' AND day=(now() AT TIME ZONE '${timeZone}')::date) WHERE site='${site}';`;

export async function checkLimits({ db, settings, conversation, ipHash, text }) {
  const { maxChars, maxUserMessages, perHour } = settings.limits;
  if (text.length > maxChars) return { ok: false, reason: "too_long" };
  if (conversation.messageCount >= maxUserMessages) return { ok: false, reason: "conversation_limit" };
  if (perHour > 0 && (await db.userMessagesLastHour(ipHash)) >= perHour) return { ok: false, reason: "hourly_limit" };
  return { ok: true };
}

const chicagoTime = (now, timeZone) =>
  new Intl.DateTimeFormat("en-US", { timeZone, dateStyle: "medium", timeStyle: "short" }).format(now);

const finite = (n) => typeof n === "number" && Number.isFinite(n);
const validPrice = (p) =>
  p && [p.inputUsd, p.cachedInputUsd, p.outputUsd].every(finite) && (p.cacheWriteUsd === undefined || finite(p.cacheWriteUsd));

const PRICE_KEYS = ["inputUsd", "cachedInputUsd", "cacheWriteUsd", "outputUsd"];

// With providerReportsCost the price table is a fallback, so a model may run with no price (an entry may hold only reasoningEffort).
export function assertPriced(settings, model) {
  const entry = settings.models?.[model];
  const unpriced = !entry || !PRICE_KEYS.some((key) => key in entry);
  const unpricedOk = settings.providerReportsCost && typeof model === "string" && model !== "" && unpriced;
  if (!unpricedOk && !validPrice(entry)) throw new Error(`No price for model ${model}`);
  if (!(settings.eurPerUsd > 0)) throw new Error("eurPerUsd must be a positive number");
  return unpricedOk ? undefined : entry;
}

const reportedCost = (usage) => {
  const usd = usage?.costUsd;
  return typeof usd === "number" && Number.isFinite(usd) && usd >= 0 ? usd : undefined;
};

async function alertPaused({ db, email, settings, day, now, subject, lines }) {
  let messages = "unavailable";
  let visitors = "unavailable";
  try {
    ({ messages, visitors } = await db.dayStats(settings.site, day, settings.timeZone));
  } catch (error) {
    console.error("Cap alert stats failed", error);
  }
  try {
    await email.send({
      subject,
      text: [
        `The chat was paused at ${chicagoTime(now, settings.timeZone)} (Chicago).`,
        ...lines,
        `Messages today: ${messages}`,
        `Visitors today: ${visitors}`,
        "",
        "To resume, run the statement below. The chat then gets a fresh daily cap from that moment.",
        resumeSql(settings.site, settings.timeZone),
      ].join("\n"),
    });
  } catch (error) {
    console.error("Cap alert email failed", error);
  }
}

export async function recordUsage({ db, email, settings, model, usage: rawUsage, now }) {
  const price = assertPriced(settings, model);

  const usage = normaliseUsage(rawUsage);
  const usd = reportedCost(rawUsage);
  const cost = usd !== undefined ? usd * settings.eurPerUsd : price ? costEur(usage, price, settings.eurPerUsd) : null;
  const { site, timeZone } = settings;
  const day = chicagoDay(now, timeZone);
  const { costEur: total } = await db.addUsage({
    site,
    day,
    inputTokens: usage.inputTokens,
    cachedInputTokens: usage.cachedInputTokens,
    outputTokens: usage.outputTokens,
    costEur: cost ?? 0,
  });

  if (cost === null) {
    console.error(`AI call for unpriced model ${model} reported no cost; pausing the chat`, usage);
    if (!(await db.pauseChat(site, "unpriced call without a reported cost"))) return;
    await alertPaused({
      db, email, settings, day, now,
      subject: "Chat paused: a call's cost is unknown",
      lines: [
        `Model ${model} has no price in server/chatSettings.js and OpenRouter reported no cost for a call.`,
        `Spent today (excluding that call): EUR ${total.toFixed(2)} (cap EUR ${settings.dailyCapEur}).`,
        "Add a price for the model or switch CHAT_MODEL before resuming.",
      ],
    });
    return;
  }

  if (total < settings.dailyCapEur) return;
  if (sinceResume(total, await db.getChatState(site), day, timeZone) < settings.dailyCapEur) return;
  if (!(await db.pauseChat(site, "daily cap reached"))) return;
  await alertPaused({
    db, email, settings, day, now,
    subject: "Chat paused: daily cap reached",
    lines: [`Spent today: EUR ${total.toFixed(2)} (cap EUR ${settings.dailyCapEur}).`],
  });
}
