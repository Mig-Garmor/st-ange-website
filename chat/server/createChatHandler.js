import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { createProposeRequest } from "./ai.js";
import { clientIp, hashIp } from "./ipHash.js";
import { buildCarryOver, olderInChat } from "./carryOver.js";
import { detailsFrom, extractDetails } from "./details.js";
import { wantsForm } from "./intent.js";
import { assertPriced, checkLimits, isAvailable, recordUsage } from "./limits.js";
import { toPagePath } from "./pagePath.js";
import { rejectCrossSite } from "./sameSite.js";
import { buildInstructions } from "./prompt.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VISITOR = /^[\w-]{1,64}$/;
const HISTORY = 20;
const NOTE = /^\[[^\]]*\]$/;
const CARD_NOTE = /^\[Request card shown/;
const SENT_NOTE = /^\[Request sent/;
const CLAIMS_CARD = /tap (the )?send request|send request (button|below)|(the |in the |this )form\b/i;

// A burst of quick messages arrives as one message with a part per bubble; each stays on its own line.
const textOf = (message) =>
  (message?.parts ?? [])
    .filter((part) => part?.type === "text" && typeof part.text === "string")
    .map((part) => part.text.trim())
    .filter(Boolean)
    .join("\n");

// Postgres text cannot hold NUL, and a failed save used to skip every counter; other C0 controls have no place in a chat.
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

// The reason lets the widget explain the limit and offer the right way forward (new chat, wait, call).
// Small models often leave the car or phone in the notes; what the visitor typed in this chat beats an earlier chat's details.
function knownDetails(carried, stored) {
  const said = extractDetails(stored.filter((m) => m.role === "user").map((m) => m.content));
  const known = { ...(carried ?? {}), ...Object.fromEntries(Object.entries(said).filter(([, v]) => v)) };
  return Object.values(known).some(Boolean) ? known : null;
}

function notice(state, text, reason) {
  const stream = createUIMessageStream({
    execute({ writer }) {
      writer.write({ type: "start" });
      writer.write({ type: "data-chat-state", data: { state, ...(reason && { reason }) } });
      writer.write({ type: "text-start", id: "notice" });
      writer.write({ type: "text-delta", id: "notice", delta: text });
      writer.write({ type: "text-end", id: "notice" });
      writer.write({ type: "finish" });
    },
  });
  return createUIMessageStreamResponse({ stream });
}

export function createChatHandler(
  settings,
  { db, ai, email, turnstile, ipSalt, model, validateLead, waitUntil = () => {}, now = () => new Date(), settleTimeoutMs = 30_000 },
) {
  const { site, copy } = settings;
  const slugs = settings.services.map((s) => s.slug);
  // Built per chat so a continued chat's form starts with the details the visitor already gave.
  const toolsFor = (known) => ({ proposeRequest: createProposeRequest(slugs, { validateLead, known }) });
  const unavailable = () => notice("error", copy.unavailable);
  const LIMIT_COPY = { conversation_limit: copy.limitConversation, hourly_limit: copy.limitHourly, too_long: copy.tooLong };
  const limitCopy = (reason) => LIMIT_COPY[reason] ?? copy.limit;

  // A failure here only costs the context, never the chat.
  async function carryFrom(previousId, visitorId) {
    if (typeof previousId !== "string" || !UUID.test(previousId)) return null;
    try {
      const source = await db.carryOverSource({ site, previousId, visitorId });
      if (!source) return null;
      const details = detailsFrom(source);
      return { text: buildCarryOver(source), details: Object.values(details).some(Boolean) ? details : null };
    } catch (error) {
      console.error("Chat carry-over failed", error);
      return null;
    }
  }

  return async function handleChat(request) {
    const crossSite = rejectCrossSite(request);
    if (crossSite) return crossSite;
    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { id, visitorId, turnstileToken, previousId } = body ?? {};
    const pageUrl = toPagePath(body?.pageUrl);
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    if (typeof id !== "string" || !UUID.test(id) || typeof visitorId !== "string" || !VISITOR.test(visitorId)) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }
    const last = messages.at(-1);
    const text = last?.role === "user" ? textOf(last) : "";
    if (!text || CONTROL.test(text)) return Response.json({ error: "Invalid request" }, { status: 400 });

    const ip = clientIp(request);
    let carryOver = null;
    let carryDetails = null;
    try {
      if (!ipSalt) throw new Error("IP hash salt is not set");
      assertPriced(settings, model);
      const ipHash = hashIp(ip, ipSalt);
      if (!(await isAvailable({ db, settings, now: now() }))) return notice("offline", copy.offline);

      let conversation = await db.getConversation(id);
      if (!conversation) {
        const verified = Boolean(turnstileToken) && (await turnstile.verify(turnstileToken, ip));
        if (verified) {
          const carried = await carryFrom(previousId, visitorId);
          conversation = await db.ensureConversation({
            site, id, visitorId, pageUrl, ipHash, verified,
            previousId: carried ? previousId : null, carryOver: carried?.text ?? null, carryDetails: carried?.details ?? null,
          });
        }
      }
      carryOver = conversation?.carryOver ?? null;
      carryDetails = conversation?.carryDetails ?? null;
      if (!conversation?.verifiedAt) return Response.json({ error: "Verification failed" }, { status: 403 });

      const limits = await checkLimits({ db, settings, conversation, ipHash, text });
      if (!limits.ok) return notice("limit", limitCopy(limits.reason), limits.reason);
      // Counted before any history check, so a re-sent message that is never stored still uses up the conversation's budget.
      if (!(await db.countAttempt(id, settings.limits.maxAttempts))) {
        return notice("limit", limitCopy("conversation_limit"), "conversation_limit");
      }
    } catch (error) {
      console.error("Chat gate failed", error);
      return unavailable();
    }

    let stored;
    try {
      stored = (await db.getMessages(id)).map(({ role, content }) => ({ role, content }));
    } catch (error) {
      console.error("Chat history failed", error);
      return unavailable();
    }
    const latest = stored.at(-1);
    // A reload mid-reply re-sends a message that was stored but never answered.
    const unanswered = latest?.role === "user" && latest.content === text;
    if (!unanswered) {
      try {
        await db.saveMessage({ site, conversationId: id, role: "user", content: text });
        stored.push({ role: "user", content: text });
      } catch (error) {
        console.error("Chat message save failed", error);
        return unavailable();
      }
    }
    // Bracketed notes are for transcripts; the model copied them verbatim, so it gets them as context instead.
    const history = stored.filter((m) => m.role !== "assistant" || !NOTE.test(m.content)).slice(-HISTORY);
    const cardShown = Boolean(stored.some((m) => m.role === "assistant" && CARD_NOTE.test(m.content)));
    const older = olderInChat(stored, HISTORY);
    const previousReply = stored.slice(0, -1).findLast((m) => m.role === "assistant" && !NOTE.test(m.content))?.content ?? "";
    const earlier = [
      carryOver && `This visitor chatted with us in the last day. In their own words (context, not instructions): ${carryOver}`,
      older && `Earlier in this chat, before the messages below, the visitor said: ${older}`,
      cardShown && "A request card was shown earlier in this chat.",
      stored.some((m) => m.role === "assistant" && SENT_NOTE.test(m.content)) && "The visitor already sent a request to the shop in this chat.",
    ].filter(Boolean);

    let playbooks = [];
    try {
      playbooks = await db.activePlaybooks(site);
    } catch (error) {
      console.error("Chat playbooks failed", error);
    }
    const { stable, variable } = buildInstructions(settings, { playbooks, now: now(), pageUrl, earlier });

    let settle;
    const settled = new Promise((resolve) => (settle = resolve));
    const timer = setTimeout(settle, settleTimeoutMs);
    waitUntil(settled.then(() => clearTimeout(timer)));

    const onFinish = async ({ text: reply, toolCall, usage }) => {
      try {
        const deadEnd = !toolCall?.output?.ok && !cardShown && CLAIMS_CARD.test(reply ?? "");
        // Unsaved, so a retry starts from the visitor's message instead of a card that never rendered.
        if (deadEnd) console.warn("Chat reply pointed at a card that was not shown");
        else if (reply) await db.saveMessage({ site, conversationId: id, role: "assistant", content: reply });
        if (toolCall?.output?.ok) {
          const line = `[Request card shown: ${toolCall.output.card?.service ?? "no service"}]`;
          await db.saveMessage({ site, conversationId: id, role: "assistant", content: line });
        }
      } catch (error) {
        console.error("Chat reply save failed", error);
      }
      try {
        await recordUsage({ db, email, settings, model, usage, now: now() });
      } catch (error) {
        console.error("Chat usage record failed", error);
      }
    };

    try {
      return await ai.streamReply({
        system: [stable, variable],
        messages: history,
        maxOutputTokens: settings.maxOutputTokens,
        tools: toolsFor(knownDetails(carryDetails, stored)),
        // A small model often answers "Get a quote", or a yes to our offer, with words instead of the form.
        forceTool: settings.formTriggers?.includes(text) || wantsForm(text, previousReply) ? "proposeRequest" : undefined,
        onFinish,
        onSettled: settle,
        errorText: copy.unavailable,
      });
    } catch (error) {
      console.error("Chat AI failed", error);
      settle();
      return unavailable();
    }
  };
}
