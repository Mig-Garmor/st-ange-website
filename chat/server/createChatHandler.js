import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { createProposeRequest } from "./ai.js";
import { clientIp, hashIp } from "./ipHash.js";
import { checkLimits, isAvailable, recordUsage } from "./limits.js";
import { buildInstructions } from "./prompt.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HISTORY = 20;

const textOf = (message) =>
  (message?.parts ?? [])
    .filter((part) => part?.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("");

const clientHistory = (messages) =>
  messages
    .filter((m) => m?.role === "user" || m?.role === "assistant")
    .map((m) => ({ role: m.role, content: textOf(m) }))
    .filter((m) => m.content)
    .slice(-HISTORY);

function notice(state, text) {
  const stream = createUIMessageStream({
    execute({ writer }) {
      writer.write({ type: "start" });
      writer.write({ type: "data-chat-state", data: { state } });
      writer.write({ type: "text-start", id: "notice" });
      writer.write({ type: "text-delta", id: "notice", delta: text });
      writer.write({ type: "text-end", id: "notice" });
      writer.write({ type: "finish" });
    },
  });
  return createUIMessageStreamResponse({ stream });
}

export function createChatHandler(settings, { db, ai, email, turnstile, ipSalt, model, now = () => new Date() }) {
  const { site, copy } = settings;
  const tools = { proposeRequest: createProposeRequest(settings.services.map((s) => s.slug)) };
  const unavailable = () => notice("error", copy.unavailable);

  return async function handleChat(request) {
    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { id, visitorId, pageUrl = null, turnstileToken } = body ?? {};
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    if (typeof id !== "string" || !UUID.test(id) || typeof visitorId !== "string" || !visitorId) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }
    const last = messages.at(-1);
    const text = last?.role === "user" ? textOf(last) : "";
    if (!text) return Response.json({ error: "Invalid request" }, { status: 400 });

    const ip = clientIp(request);
    try {
      if (!ipSalt) throw new Error("IP hash salt is not set");
      if (!settings.models[model]) throw new Error(`No price for model ${model}`);
      const ipHash = hashIp(ip, ipSalt);
      if (!(await isAvailable({ db, settings, now: now() }))) return notice("offline", copy.offline);

      const verified = turnstileToken ? await turnstile.verify(turnstileToken, ip) : false;
      const conversation = await db.ensureConversation({ site, id, visitorId, pageUrl, ipHash, verified });
      if (!conversation.verifiedAt) return Response.json({ error: "Verification failed" }, { status: 403 });

      const limits = await checkLimits({ db, settings, conversation, ipHash, text });
      if (!limits.ok) return notice("limit", copy.limit);
    } catch (error) {
      console.error("Chat gate failed", error);
      return unavailable();
    }

    let history;
    try {
      await db.saveMessage({ site, conversationId: id, role: "user", content: text });
      const stored = await db.getMessages(id);
      history = stored.map(({ role, content }) => ({ role, content })).slice(-HISTORY);
    } catch (error) {
      console.error("Chat history failed, using client text", error);
      history = clientHistory(messages);
    }

    let playbooks = [];
    try {
      playbooks = await db.activePlaybooks(site);
    } catch (error) {
      console.error("Chat playbooks failed", error);
    }
    const { stable, variable } = buildInstructions(settings, { playbooks, now: now(), pageUrl });

    const onFinish = async ({ text: reply, toolCall, usage }) => {
      try {
        if (reply) await db.saveMessage({ site, conversationId: id, role: "assistant", content: reply });
        if (toolCall) {
          const line = `[Request card shown: ${toolCall.input?.service ?? "no service"}]`;
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
        system: `${stable}\n\n${variable}`,
        messages: history,
        maxOutputTokens: settings.maxOutputTokens,
        tools,
        onFinish,
        errorText: copy.unavailable,
      });
    } catch (error) {
      console.error("Chat AI failed", error);
      return unavailable();
    }
  };
}
