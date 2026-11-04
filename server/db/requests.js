export function requestsDb(sql) {
  return {
    async recordRequest({ site, idempotencyKey, source, service = null, leadId = null, conversationId = null, subject = null, message = null, vehicle = null, pageUrl = null }) {
      const [row] = await sql`
        insert into requests (site, idempotency_key, source, service, lead_id, conversation_id, subject, message, vehicle, page_url)
        values (${site}, ${idempotencyKey}, ${source}, ${service}, ${leadId}, ${conversationId}, ${subject}, ${message}, ${vehicle}, ${pageUrl})
        on conflict (idempotency_key) do nothing
        returning id, email_status`;
      if (row) return { id: row.id, duplicate: false, emailStatus: row.email_status };
      const [existing] = await sql`select id, email_status from requests where idempotency_key = ${idempotencyKey}`;
      return { id: existing.id, duplicate: true, emailStatus: existing.email_status };
    },

    async countRequestsForConversation(conversationId, exceptKey = null) {
      const [row] = await sql`
        select count(*)::int as n from requests
        where conversation_id = ${conversationId} and idempotency_key is distinct from ${exceptKey}`;
      return row.n;
    },

    async setRequestEmailStatus(id, { status, error = null }) {
      await sql`update requests set email_status = ${status}, email_error = ${error} where id = ${id}`;
    },
  };
}
