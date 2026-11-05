export function retentionDb(sql) {
  return {
    // Chats past their period go with their messages; requests keep their row but lose the link. Leads go only once no request needs them.
    async purgeExpired({ site, chatMonths, leadYears }) {
      const [, , , chats, , , leads] = await sql.transaction([
        sql`update conversations set previous_id = null where previous_id in (
          select id from conversations where site = ${site} and coalesce(last_message_at, created_at) < now() - make_interval(months => ${chatMonths}))`,
        sql`update requests set conversation_id = null where conversation_id in (
          select id from conversations where site = ${site} and coalesce(last_message_at, created_at) < now() - make_interval(months => ${chatMonths}))`,
        sql`delete from messages where conversation_id in (
          select id from conversations where site = ${site} and coalesce(last_message_at, created_at) < now() - make_interval(months => ${chatMonths}))`,
        sql`delete from conversations where site = ${site} and coalesce(last_message_at, created_at) < now() - make_interval(months => ${chatMonths}) returning id`,
        sql`delete from requests where site = ${site} and created_at < now() - make_interval(years => ${leadYears})`,
        sql`update conversations set lead_id = null where lead_id in (
          select l.id from leads l where l.site = ${site} and l.updated_at < now() - make_interval(years => ${leadYears})
            and not exists (select 1 from requests r where r.lead_id = l.id))`,
        sql`delete from leads l where l.site = ${site} and l.updated_at < now() - make_interval(years => ${leadYears})
          and not exists (select 1 from requests r where r.lead_id = l.id) returning id`,
      ]);
      return { chats: chats.length, leads: leads.length };
    },
  };
}
