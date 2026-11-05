export function requestsDb(sql) {
  return {
    async recordRequest({ site, idempotencyKey, source, service = null, leadId = null, conversationId = null, subject = null, message = null, vehicle = null, pageUrl = null, ipHash = null, consentText = null }) {
      const [row] = await sql`
        insert into requests (site, idempotency_key, source, service, lead_id, conversation_id, subject, message, vehicle, page_url, ip_hash, consent_text, consent_at)
        values (${site}, ${idempotencyKey}, ${source}, ${service}, ${leadId}, ${conversationId}, ${subject}, ${message}, ${vehicle}, ${pageUrl}, ${ipHash},
          ${consentText}, case when ${consentText}::text is not null then now() end)
        on conflict (idempotency_key) do nothing
        returning id, email_status`;
      if (row) return { id: row.id, duplicate: false, emailStatus: row.email_status };
      const [existing] = await sql`select id, email_status from requests where idempotency_key = ${idempotencyKey}`;
      return { id: existing.id, duplicate: true, emailStatus: existing.email_status };
    },

    // A known key is a retry and takes no slot; otherwise the slot is taken atomically, so parallel posts cannot overshoot.
    async claimRequestSlot(conversationId, idempotencyKey, max) {
      const [known] = await sql`select 1 from requests where idempotency_key = ${idempotencyKey}`;
      if (known) return true;
      const rows = await sql`
        update conversations set request_count = request_count + 1
        where id = ${conversationId} and request_count < ${max} returning request_count`;
      return rows.length > 0;
    },

    async formRequestsLastHour(ipHash) {
      const [row] = await sql`
        select count(*)::int as n from requests
        where ip_hash = ${ipHash} and source <> 'chat' and created_at > now() - interval '1 hour'`;
      return row.n;
    },

    async setRequestEmailStatus(id, { status, error = null }) {
      await sql`update requests set email_status = ${status}, email_error = ${error} where id = ${id}`;
    },
  };
}
