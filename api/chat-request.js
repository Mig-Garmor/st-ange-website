import { waitUntil } from "@vercel/functions";
import { createRequestHandler } from "../chat/server/createRequestHandler.js";
import { chatServerSettings } from "../server/chatSettings.js";
import { createRequestService } from "../server/requests.js";
import { db as openDb, email, hub } from "../server/services.js";
import { validateLead } from "../server/validate.js";

export async function POST(request) {
  const db = openDb();
  const requests = createRequestService({ db, email: email(), site: chatServerSettings.site, hub: hub(), waitUntil });
  return createRequestHandler(chatServerSettings, { db, requests, validateLead })(request);
}
