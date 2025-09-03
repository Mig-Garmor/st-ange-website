import SibApiV3Sdk from "@sendinblue/client";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { name, email, phone, message } = req.body;

  const client = new SibApiV3Sdk.TransactionalEmailsApi();
  client.setApiKey(
    SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey,
    process.env.BREVO_API_KEY
  );

  try {
    await client.sendTransacEmail({
      sender: { email: "migarmoral42@gmail.com" },
      to: [{ email: "migarmoral42@gmail.com" }],
      subject: `New Contact from ${name}`,
      textContent: `Message: ${message}\nFrom: ${email}\nPhone: ${phone}`,
    });

    return res.status(200).json({ message: "Email sent successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to send email" });
  }
}
