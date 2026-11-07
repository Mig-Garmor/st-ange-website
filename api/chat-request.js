import { createRequestHandler } from "../chat/server/createRequestHandler.js";
import { chatServerSettings } from "../server/chatSettings.js";
import { createRequestService } from "../server/requests.js";
import { db as openDb, email } from "../server/services.js";
import { validateLead } from "../server/validate.js";

export async function POST(request) {
  const db = openDb();
  const requests = createRequestService({ db, email: email(), site: chatServerSettings.site });
  return createRequestHandler(chatServerSettings, { db, requests, validateLead })(request);
}
