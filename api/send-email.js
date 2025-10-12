import SibApiV3Sdk from "@sendinblue/client";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { name, email, phone, message, subject } = req.body.data;

  const client = new SibApiV3Sdk.TransactionalEmailsApi();
  client.setApiKey(
    SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey,
    process.env.BREVO_API_KEY
  );

  try {
    await client.sendTransacEmail({
      sender: { email: "st.angeautos@gmail.com" },
      to: [{ email: "st.angeautos@gmail.com" }],
      subject: subject ? `${subject}` : `Service Request from ${name}`,
      textContent: `Name: ${name}\nMessage: ${message}\nFrom: ${email}\nPhone: ${phone}`,
    });

    return res.status(200).json({ message: "Email sent successfully" });
  } catch (error) {
    // Capture Brevo response if available
    let errorMessage = error.response?.body || error.message || error;
    console.error("Email sending failed:", errorMessage);

    // Make sure the error is visible in the response too
    return res.status(500).json({ error: errorMessage });
  }
}
