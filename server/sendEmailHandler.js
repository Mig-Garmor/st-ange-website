import { validateLead } from "./validate.js";

const SOURCES = ["contact_form", "quote_form"];

export async function handleSendEmail(body, { requests }) {
  const data = body?.data ?? {};
  const source = data.source || "contact_form";
  if (!SOURCES.includes(source)) return { status: 400, json: { error: "Invalid request", errors: { source: "Unknown source" } } };
  const { ok, errors, lead } = validateLead(data, {
    requireVehicle: source === "quote_form",
    requireEmail: source === "contact_form",
  });
  if (!ok) return { status: 400, json: { error: "Invalid request", errors } };

  const message = typeof data.message === "string" ? data.message : "";
  const subject = data.subject ? String(data.subject) : `Service Request from ${lead.name}`;
  const text = `Name: ${lead.name}\nMessage: ${message}\nFrom: ${lead.email || "not given (call back by phone)"}\nPhone: ${data.phone}`;

  const { emailStatus } = await requests.submit({
    source,
    service: data.service || null,
    idempotencyKey: data.idempotencyKey || crypto.randomUUID(),
    lead,
    subject,
    text,
    message,
    vehicle: lead.vehicle || null,
    pageUrl: data.pageUrl || null,
  });

  if (emailStatus === "failed") return { status: 500, json: { error: "Email failed" } };
  return { status: 200, json: { message: "Email sent successfully" } };
}
