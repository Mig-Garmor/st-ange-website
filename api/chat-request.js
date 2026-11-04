import { createRequestHandler } from "../chat/server/createRequestHandler.js";
import { chatServerSettings } from "../server/chatSettings.js";
import { getSql } from "../server/db/client.js";
import { createDb } from "../server/db/index.js";
import { createEmail } from "../server/email.js";
import { createRequestService } from "../server/requests.js";
import { validateLead } from "../server/validate.js";

const unavailable = () => {
  throw new Error("DATABASE_URL is not set");
};
const noDb = new Proxy({}, { get: () => unavailable });

export async function POST(request) {
  const db = process.env.DATABASE_URL ? createDb(getSql()) : noDb;
  const requests = createRequestService({
    db,
    email: createEmail({
      apiKey: process.env.BREVO_API_KEY,
      to: process.env.LEAD_EMAIL_TO ?? "st.angeautos@gmail.com",
    }),
    site: chatServerSettings.site,
  });
  return createRequestHandler(chatServerSettings, { db, requests, validateLead })(request);
}
