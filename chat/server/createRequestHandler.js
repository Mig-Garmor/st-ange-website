import { validateLead } from "../../server/validate.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SENT_NOTE = "[Request sent to the shop]";

const label = (role) => (role === "user" ? "Customer" : "Assistant");
const str = (v) => (typeof v === "string" ? v.trim() : "");

export function createRequestHandler(settings, { db, requests }) {
  const { site, services } = settings;

  return async function handleRequest(request) {
    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const conversationId = body?.conversationId;
    const idempotencyKey = str(body?.idempotencyKey);
    if (typeof conversationId !== "string" || !UUID.test(conversationId) || !idempotencyKey) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    try {
      const conversation = await db.getConversation(conversationId);
      if (!conversation?.verifiedAt) return Response.json({ error: "Verification failed" }, { status: 403 });
    } catch (error) {
      console.error("Chat request gate failed", error);
      return Response.json({ error: "Verification failed" }, { status: 403 });
    }

    const { ok, errors, lead } = validateLead(body, { requireVehicle: true });
    if (!ok) return Response.json({ status: "invalid", errors }, { status: 400 });

    const slug = str(body.service) || null;
    const serviceName = services.find((s) => s.slug === slug)?.name ?? "Service";
    const notes = str(body.notes);
    const pageUrl = str(body.pageUrl) || null;

    let transcript = [];
    try {
      transcript = await db.getMessages(conversationId);
    } catch (error) {
      console.error("Chat transcript read failed", error);
    }

    const text = [
      `Name: ${lead.name}`,
      `Phone: ${str(body.phone)}`,
      `Email: ${lead.email || "not given"}`,
      `Vehicle: ${lead.vehicle}`,
      `Service: ${serviceName}`,
      `Notes: ${notes}`,
      pageUrl && `Page: ${pageUrl}`,
      "",
      "Conversation:",
      ...transcript.map(({ role, content }) => `${label(role)}: ${content}`),
    ]
      .filter((line) => line !== null && line !== false && line !== undefined)
      .join("\n");

    const { emailStatus, leadId } = await requests.submit({
      source: "chat",
      service: slug,
      idempotencyKey,
      lead,
      subject: `[Chat] ${serviceName} request from ${lead.name}`,
      text,
      message: notes,
      vehicle: lead.vehicle,
      pageUrl,
      conversationId,
    });

    if (emailStatus !== "sent") return Response.json({ status: "failed" });

    try {
      if (leadId) await db.linkLead(conversationId, leadId);
    } catch (error) {
      console.error("Chat lead link failed", error);
    }
    try {
      await db.saveMessage({ site, conversationId, role: "assistant", content: SENT_NOTE });
    } catch (error) {
      console.error("Chat sent note save failed", error);
    }
    return Response.json({ status: "sent" });
  };
}
