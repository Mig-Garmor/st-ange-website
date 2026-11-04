import { toPagePath } from "../chat/server/pagePath.js";
import { services } from "../src/config/business.js";
import { validateLead } from "./validate.js";

const MAX_MESSAGE = 2000;
const isService = (slug) => services.some((s) => s.slug === slug);

const SOURCES = ["contact_form", "quote_form"];

export async function handleSendEmail(body, { requests }) {
  const data = body?.data ?? {};
  const source = data.source || "contact_form";
  if (!SOURCES.includes(source)) return { status: 400, json: { error: "Invalid request", errors: { source: "Unknown source" } } };
  const { ok, errors, lead } = validateLead(data, {
    requireVehicle: source === "quote_form",
    requireEmail: source === "contact_form",
  });
  const message = typeof data.message === "string" ? data.message : "";
  if (message.length > MAX_MESSAGE) errors.message = `Use ${MAX_MESSAGE} characters or fewer`;
  if (!ok || errors.message) return { status: 400, json: { error: "Invalid request", errors } };

  const subject = data.subject ? String(data.subject) : `Service Request from ${lead.name}`;
  const text = `Name: ${lead.name}\nMessage: ${message}\nFrom: ${lead.email || "not given (call back by phone)"}\nPhone: ${data.phone}`;

  const { emailStatus } = await requests.submit({
    source,
    service: isService(data.service) ? data.service : null,
    idempotencyKey: data.idempotencyKey || crypto.randomUUID(),
    lead,
    subject,
    text,
    message,
    vehicle: lead.vehicle || null,
    pageUrl: toPagePath(data.pageUrl),
  });

  if (emailStatus === "failed") return { status: 500, json: { error: "Email failed" } };
  return { status: 200, json: { message: "Email sent successfully" } };
}
