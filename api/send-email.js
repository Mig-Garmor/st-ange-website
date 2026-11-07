import { waitUntil } from "@vercel/functions";
import { clientIp, hashIp } from "../chat/server/ipHash.js";
import { rejectCrossSite } from "../chat/server/sameSite.js";
import { chatServerSettings } from "../server/chatSettings.js";
import { createRequestService } from "../server/requests.js";
import { handleSendEmail } from "../server/sendEmailHandler.js";
import { db as openDb, email, hub, hasDb, turnstile } from "../server/services.js";

export async function POST(request) {
  const crossSite = rejectCrossSite(request);
  if (crossSite) return crossSite;
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const db = openDb();
  const requests = createRequestService({ db, email: email(), site: chatServerSettings.site, hub: hub(), waitUntil });

  const ip = clientIp(request);
  const salt = process.env.IP_HASH_SALT;
  const { status, json } = await handleSendEmail(body, {
    requests,
    ip,
    ipHash: salt ? hashIp(ip, salt) : null,
    countRecent: hasDb() ? (ipHash) => db.formRequestsLastHour(ipHash) : null,
    // Without a secret the form posts without a token, so it keeps working until Turnstile is configured.
    turnstile: process.env.TURNSTILE_SECRET_KEY ? turnstile() : null,
  });
  return Response.json(json, { status });
}
