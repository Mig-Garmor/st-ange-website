export function createRequestService({ db, email, site, logger = console }) {
  async function safe(label, fn) {
    try {
      return await fn();
    } catch (error) {
      logger.error(`${label} failed:`, error);
      return null;
    }
  }

  return {
    async submit({ source, service = null, idempotencyKey, lead = {}, subject, text, message = null, vehicle = null, pageUrl = null, conversationId = null, ipHash = null, requireRecord = false }) {
      const saved = await safe("upsertLead", () => db.upsertLead({ site, ...lead }));
      const request = await safe("recordRequest", () =>
        db.recordRequest({
          site, idempotencyKey, source, service, leadId: saved?.id ?? null,
          conversationId, subject, message, vehicle, pageUrl, ipHash,
        }),
      );
      // Without a row the per-conversation cap cannot see this request, so an unrecorded chat request is never emailed.
      if (requireRecord && !request) return { emailStatus: "failed", duplicate: false, leadId: saved?.id ?? null };

      const duplicate = Boolean(request?.duplicate);
      if (duplicate && request.emailStatus !== "failed") return { emailStatus: "sent", duplicate: true, leadId: saved?.id ?? null };

      let emailStatus = "sent";
      let error = null;
      try {
        await email.send({ subject, text });
      } catch (e) {
        emailStatus = "failed";
        error = String(e?.response?.body?.message ?? e?.message ?? e).slice(0, 500);
        logger.error("Email sending failed:", e?.response?.body || e);
      }

      if (request?.id) await safe("setRequestEmailStatus", () => db.setRequestEmailStatus(request.id, { status: emailStatus, error }));
      return { emailStatus, duplicate, ...(duplicate && { resent: true }), leadId: saved?.id ?? null };
    },
  };
}
