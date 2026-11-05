import { CUSTOMER_HEADER, oneLine, quoted } from "./emailText.js";
import { toPagePath } from "./pagePath.js";
import { formatPhone } from "./proposal.js";
import { rejectCrossSite } from "./sameSite.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Postgres rejects unique-index entries over about 2.7 KB, which made oversized keys skip the request row.
const KEY = /^[\w:.-]{1,200}$/;
const SENT_NOTE = "[Request sent to the shop]";
const MAX_REQUESTS = 3;
const MAX_LENGTH = { name: 100, vehicle: 100, email: 200, notes: 1000 };

const label = (role) => (role === "user" ? "Customer" : "Assistant");
const str = (v) => (typeof v === "string" ? v.trim() : "");

const tooLong = (body) =>
  Object.fromEntries(
    Object.entries(MAX_LENGTH)
      .filter(([field, max]) => typeof body[field] === "string" && body[field].trim().length > max)
      .map(([field, max]) => [field, `Use ${max} characters or fewer`]),
  );

export function createRequestHandler(settings, { db, requests, validateLead }) {
  const { site, services } = settings;

  return async function handleRequest(request) {
    const crossSite = rejectCrossSite(request);
    if (crossSite) return crossSite;
    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const conversationId = body?.conversationId;
    const idempotencyKey = str(body?.idempotencyKey);
    if (typeof conversationId !== "string" || !UUID.test(conversationId) || !KEY.test(idempotencyKey)) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    try {
      const conversation = await db.getConversation(conversationId);
      if (!conversation?.verifiedAt) return Response.json({ error: "Verification failed" }, { status: 403 });
      if (!(await db.claimRequestSlot(conversationId, idempotencyKey, MAX_REQUESTS))) {
        return Response.json({ status: "limit" }, { status: 429 });
      }
    } catch (error) {
      console.error("Chat request gate failed", error);
      return Response.json({ error: "Verification failed" }, { status: 403 });
    }

    const lengthErrors = tooLong(body);
    const { ok, errors, lead } = validateLead(body, { requireVehicle: true, requireEmail: true });
    if (!ok || Object.keys(lengthErrors).length) {
      return Response.json({ status: "invalid", errors: { ...errors, ...lengthErrors } }, { status: 400 });
    }

    const service = services.find((s) => s.slug === str(body.service));
    const slug = service?.slug ?? null;
    const serviceName = service?.name ?? "Service";
    const notes = str(body.notes);
    const pageUrl = toPagePath(body.pageUrl);

    let transcript = [];
    try {
      transcript = await db.getMessages(conversationId);
    } catch (error) {
      console.error("Chat transcript read failed", error);
    }

    const text = [
      CUSTOMER_HEADER,
      "",
      `Name: ${oneLine(lead.name)}`,
      `Phone: ${formatPhone(lead.phone)}`,
      `Email: ${oneLine(lead.email) || "not given"}`,
      `Vehicle: ${oneLine(lead.vehicle)}`,
      `Service: ${serviceName}`,
      pageUrl && `Page: ${pageUrl}`,
      "",
      "Notes:",
      quoted(notes),
      "",
      "Conversation:",
      ...transcript
        .filter(({ role, content }) => !(role === "assistant" && /^\[.*\]$/.test(content.trim())))
        .map(({ role, content }) => `> ${label(role)}: ${oneLine(content)}`),
    ]
      .filter((line) => line !== null && line !== false && line !== undefined)
      .join("\n");

    const { emailStatus, leadId, duplicate, resent } = await requests.submit({
      source: "chat",
      service: slug,
      idempotencyKey,
      lead,
      subject: `[Chat] ${serviceName} request from ${oneLine(lead.name)}`,
      text,
      message: notes,
      vehicle: lead.vehicle,
      pageUrl,
      conversationId,
      requireRecord: true,
    });

    if (emailStatus !== "sent") return Response.json({ status: "failed" });
    if (duplicate && !resent) return Response.json({ status: "sent" });

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
