import SibApiV3Sdk from "@sendinblue/client";
import { business } from "../src/config/business.js";

export function createEmail({ apiKey, to, sender = business.email }) {
  return {
    async send({ subject, text }) {
      const client = new SibApiV3Sdk.TransactionalEmailsApi();
      client.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, apiKey);
      await client.sendTransacEmail({
        sender: { email: sender },
        to: [{ email: to }],
        subject,
        textContent: text,
      });
    },
  };
}
