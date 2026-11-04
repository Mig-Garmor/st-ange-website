import { getSql } from "../server/db/client.js";
import { createDb } from "../server/db/index.js";
import { createEmail } from "../server/email.js";
import { createRequestService } from "../server/requests.js";
import { handleSendEmail } from "../server/sendEmailHandler.js";

const unavailable = () => {
  throw new Error("DATABASE_URL is not set");
};
const noDb = new Proxy({}, { get: () => unavailable });

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const db = process.env.DATABASE_URL ? createDb(getSql()) : noDb;
  const email = createEmail({
    apiKey: process.env.BREVO_API_KEY,
    to: process.env.LEAD_EMAIL_TO ?? "st.angeautos@gmail.com",
  });
  const requests = createRequestService({ db, email, site: "st-ange" });

  const { status, json } = await handleSendEmail(body, { requests });
  return Response.json(json, { status });
}
