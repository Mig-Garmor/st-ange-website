export function conversationsDb(sql) {
  return {
    async ensureConversation({ site, id, visitorId, pageUrl = null, ipHash = null, verified = false, previousId = null, carryOver = null, carryDetails = null }) {
      await sql`
        insert into conversations (id, site, visitor_id, page_url, ip_hash, verified_at, previous_id, carry_over, carry_details)
        values (${id}, ${site}, ${visitorId}, ${pageUrl}, ${ipHash}, case when ${Boolean(verified)}::boolean then now() end, ${previousId}, ${carryOver}, ${carryDetails})
        on conflict (id) do nothing`;
      return this.getConversation(id);
    },

    async getConversation(id) {
      const [row] = await sql`select id, verified_at, message_count, carry_over, carry_details from conversations where id = ${id}`;
      return row
        ? { id: row.id, verifiedAt: row.verified_at, messageCount: row.message_count, carryOver: row.carry_over, carryDetails: row.carry_details }
        : null;
    },

    // Only the same visitor's chat, active in the last 24 hours, can hand its context to a new one.
    async carryOverSource({ site, previousId, visitorId }) {
      const [row] = await sql`
        select c.summary, l.name, l.phone, l.email, l.vehicle,
          (select coalesce(array_agg(content order by created_at), '{}') from (
            select content, created_at from messages where conversation_id = c.id and role = 'user'
            order by created_at desc limit 12) recent) as user_messages
        from conversations c left join leads l on l.id = c.lead_id
        where c.id = ${previousId} and c.site = ${site} and c.visitor_id = ${visitorId}
          and c.last_message_at > now() - interval '24 hours'`;
      return row
        ? {
            summary: row.summary,
            lead: { name: row.name, phone: row.phone, email: row.email, vehicle: row.vehicle },
            userMessages: row.user_messages,
          }
        : null;
    },

    async saveMessage({ site, conversationId, role, content }) {
      const insert = sql`insert into messages (site, conversation_id, role, content) values (${site}, ${conversationId}, ${role}, ${content})`;
      if (role !== "user") return void (await insert);
      await sql.transaction([
        insert,
        sql`update conversations set message_count = message_count + 1, last_message_at = now() where id = ${conversationId}`,
      ]);
    },

    async getMessages(conversationId) {
      return sql`select role, content from messages where conversation_id = ${conversationId} order by created_at, id`;
    },

    async linkLead(conversationId, leadId) {
      await sql`update conversations set lead_id = ${leadId} where id = ${conversationId}`;
    },

    async countAttempt(id, max) {
      const rows = await sql`update conversations set attempts = attempts + 1 where id = ${id} and attempts < ${max} returning attempts`;
      return rows.length > 0;
    },

    async forgetIpHashes(days) {
      await sql.transaction([
        sql`update conversations set ip_hash = null where ip_hash is not null and created_at < now() - make_interval(days => ${days})`,
        sql`update requests set ip_hash = null where ip_hash is not null and created_at < now() - make_interval(days => ${days})`,
      ]);
    },

    async userMessagesLastHour(ipHash) {
      const [row] = await sql`
        select count(*)::int as n from messages m join conversations c on c.id = m.conversation_id
        where c.ip_hash = ${ipHash} and m.role = 'user' and m.created_at > now() - interval '1 hour'`;
      return row.n;
    },

    async dayStats(site, day, timeZone) {
      const [row] = await sql`
        select count(*)::int as messages, count(distinct c.visitor_id)::int as visitors
        from messages m join conversations c on c.id = m.conversation_id
        where m.site = ${site} and m.role = 'user'
          and (m.created_at at time zone ${timeZone})::date = ${day}::date`;
      return { messages: row.messages, visitors: row.visitors };
    },

    async claimForInsights(site, limit) {
      const rows = await sql`
        with claimed as (
          update conversations set insights_claimed_at = now()
          where id in (
            select id from conversations
            where site = ${site} and insights_at is null
              and last_message_at < now() - interval '60 minutes'
              and (insights_claimed_at is null or insights_claimed_at < now() - interval '60 minutes')
            order by last_message_at limit ${limit} for update skip locked)
          returning id)
        select c.id, string_agg(m.role || ': ' || m.content, E'\n' order by m.created_at, m.id) as transcript,
          exists (select 1 from requests r where r.conversation_id = c.id and r.email_status = 'sent') as request_sent
        from claimed c join messages m on m.conversation_id = c.id group by c.id`;
      return rows.map((row) => ({ id: row.id, transcript: row.transcript, requestSent: row.request_sent }));
    },

    async saveInsights(id, { summary = null, services = [], intent = null, unanswered = [], outcome = null }) {
      await sql`
        update conversations set summary = ${summary}, services = ${services}::text[], intent = ${intent},
          unanswered = ${unanswered}::text[], outcome = ${outcome}, insights_at = now()
        where id = ${id}`;
    },

    async conversationForHub(id) {
      const [row] = await sql`
        select c.id, c.created_at, c.page_url, c.summary, c.services, c.intent, c.unanswered, c.outcome, l.name, l.phone, l.email
        from conversations c left join leads l on l.id = c.lead_id where c.id = ${id}`;
      if (!row) return null;
      const messages = await sql`select role, content, created_at from messages where conversation_id = ${id} order by created_at, id`;
      return {
        id: row.id,
        startedAt: row.created_at,
        pagePath: row.page_url,
        lead: { name: row.name, phone: row.phone, email: row.email },
        insights: { summary: row.summary, services: row.services, intent: row.intent, unanswered: row.unanswered, outcome: row.outcome },
        messages: messages.map((m) => ({ role: m.role, content: m.content, at: m.created_at })),
      };
    },
  };
}
