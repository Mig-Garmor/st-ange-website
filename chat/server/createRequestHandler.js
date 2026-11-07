import { CUSTOMER_HEADER, oneLine, quoted } from "./emailText.js";
import { toPagePath } from "./pagePath.js";
import { MAX_LENGTH, formatPhone } from "../lead.js";
import { KEY, UUID, str } from "./input.js";
import { SENT_NOTE, isNote } from "./notes.js";
import { rejectCrossSite } from "./sameSite.js";

const MAX_REQUESTS = 3;

const label = (role) => (role === "user" ? "Customer" : "Assistant");

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

    const { errors, lead } = validateLead(body, { requireVehicle: true, requireEmail: true });
    // The visitor must have ticked the exact wording this site shows; it is stored as their consent to calls and texts.
    if (body.consent !== settings.callbackConsent) errors.consent = "Please tick the box so we can call or text you about this request.";
    if (str(body.notes).length > MAX_LENGTH.notes) errors.notes = `Use ${MAX_LENGTH.notes} characters or fewer`;
    if (Object.keys(errors).length) {
      return Response.json({ status: "invalid", errors }, { status: 400 });
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
        .filter((m) => !isNote(m))
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
      consentText: settings.callbackConsent,
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
