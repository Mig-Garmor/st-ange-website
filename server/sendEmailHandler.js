import { toPagePath } from "../chat/server/pagePath.js";
import { formatPhone } from "../chat/server/proposal.js";
import { services } from "../src/config/business.js";
import { CUSTOMER_HEADER, oneLine, quoted } from "../chat/server/emailText.js";
import { localOverride } from "./localOverride.js";
import { validateLead } from "./validate.js";

const MAX_MESSAGE = 2000;
// FORM_LIMIT_PER_HOUR (0 = off) only overrides the per-IP form limit in local development.
const PER_HOUR = localOverride("FORM_LIMIT_PER_HOUR", 5);
const KEY = /^[\w:.-]{1,200}$/;

const SOURCES = ["contact_form", "quote_form"];

// turnstile and countRecent are null when their env vars are unset, so the live form keeps working until they are configured.
export async function handleSendEmail(body, { requests, turnstile = null, ip = null, ipHash = null, countRecent = null }) {
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
  if (data.idempotencyKey !== undefined && data.idempotencyKey !== null && !KEY.test(String(data.idempotencyKey))) {
    return { status: 400, json: { error: "Invalid request" } };
  }

  if (turnstile && !(await turnstile.verify(data.turnstileToken, ip))) return { status: 403, json: { error: "Verification failed" } };
  if (PER_HOUR > 0 && ipHash && countRecent) {
    try {
      if ((await countRecent(ipHash)) >= PER_HOUR) return { status: 429, json: { error: "Too many requests" } };
    } catch (error) {
      console.error("Form rate limit check failed", error);
    }
  }

  const service = services.find((s) => s.slug === data.service) ?? null;
  const name = oneLine(lead.name);
  const subject =
    source === "quote_form" ? `[Quote] ${service?.name ?? "Service"} request from ${name}` : `[Contact] ${service?.name ?? "Website message"} from ${name}`;
  const text = [
    CUSTOMER_HEADER,
    "",
    `Name: ${name}`,
    `Phone: ${formatPhone(lead.phone)}`,
    `From: ${oneLine(lead.email) || "not given (call back by phone)"}`,
    "",
    "Message:",
    quoted(message),
  ].join("\n");

  const { emailStatus } = await requests.submit({
    source,
    service: service?.slug ?? null,
    idempotencyKey: data.idempotencyKey || crypto.randomUUID(),
    lead,
    subject,
    text,
    message,
    vehicle: lead.vehicle || null,
    pageUrl: toPagePath(data.pageUrl),
    ipHash,
  });

  if (emailStatus === "failed") return { status: 500, json: { error: "Email failed" } };
  return { status: 200, json: { message: "Email sent successfully" } };
}
