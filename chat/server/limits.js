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
  if ((await db.userMessagesLastHour(ipHash)) >= perHour) return { ok: false, reason: "hourly_limit" };
  return { ok: true };
}

const chicagoTime = (now, timeZone) =>
  new Intl.DateTimeFormat("en-US", { timeZone, dateStyle: "medium", timeStyle: "short" }).format(now);

const finite = (n) => typeof n === "number" && Number.isFinite(n);
const validPrice = (p) =>
  p && [p.inputUsd, p.cachedInputUsd, p.outputUsd].every(finite) && (p.cacheWriteUsd === undefined || finite(p.cacheWriteUsd));

export function assertPriced(settings, model) {
  const price = settings.models?.[model];
  if (!validPrice(price)) throw new Error(`No price for model ${model}`);
  if (!(settings.eurPerUsd > 0)) throw new Error("eurPerUsd must be a positive number");
  return price;
}

export async function recordUsage({ db, email, settings, model, usage: rawUsage, now }) {
  const price = assertPriced(settings, model);

  const usage = normaliseUsage(rawUsage);
  const { site, timeZone } = settings;
  const day = chicagoDay(now, timeZone);
  const { costEur: total } = await db.addUsage({
    site,
    day,
    inputTokens: usage.inputTokens,
    cachedInputTokens: usage.cachedInputTokens,
    outputTokens: usage.outputTokens,
    costEur: costEur(usage, price, settings.eurPerUsd),
  });
  if (total < settings.dailyCapEur) return;
  if (sinceResume(total, await db.getChatState(site), day, timeZone) < settings.dailyCapEur) return;
  if (!(await db.pauseChat(site, "daily cap reached"))) return;

  let messages = "unavailable";
  let visitors = "unavailable";
  try {
    ({ messages, visitors } = await db.dayStats(site, day));
  } catch (error) {
    console.error("Cap alert stats failed", error);
  }
  try {
    await email.send({
      subject: "Chat paused: daily cap reached",
      text: [
        `The chat was paused at ${chicagoTime(now, timeZone)} (Chicago).`,
        `Spent today: EUR ${total.toFixed(2)} (cap EUR ${settings.dailyCapEur}).`,
        `Messages today: ${messages}`,
        `Visitors today: ${visitors}`,
        "",
        "To resume, run the statement below. The chat then gets a fresh daily cap from that moment.",
        resumeSql(site, timeZone),
      ].join("\n"),
    });
  } catch (error) {
    console.error("Cap alert email failed", error);
  }
}
