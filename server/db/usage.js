export function usageDb(sql) {
  return {
    async addUsage({ site, day, inputTokens = 0, cachedInputTokens = 0, outputTokens = 0, costEur = 0 }) {
      const [row] = await sql`
        insert into ai_usage_daily (site, day, input_tokens, cached_input_tokens, output_tokens, cost_eur, calls)
        values (${site}, ${day}::date, ${inputTokens}, ${cachedInputTokens}, ${outputTokens}, ${costEur}, 1)
        on conflict (site, day) do update set
          input_tokens = ai_usage_daily.input_tokens + excluded.input_tokens,
          cached_input_tokens = ai_usage_daily.cached_input_tokens + excluded.cached_input_tokens,
          output_tokens = ai_usage_daily.output_tokens + excluded.output_tokens,
          cost_eur = ai_usage_daily.cost_eur + excluded.cost_eur,
          calls = ai_usage_daily.calls + 1
        returning cost_eur`;
      return { costEur: Number(row.cost_eur) };
    },

    async getUsage(site, day) {
      const [row] = await sql`select cost_eur, calls from ai_usage_daily where site = ${site} and day = ${day}::date`;
      return row ? { costEur: Number(row.cost_eur), calls: row.calls } : { costEur: 0, calls: 0 };
    },

    async getChatState(site) {
      await sql`insert into chat_state (site) values (${site}) on conflict (site) do nothing`;
      const [row] = await sql`select status, paused_at, pause_reason from chat_state where site = ${site}`;
      return { status: row.status, pausedAt: row.paused_at, pauseReason: row.pause_reason };
    },

    async pauseChat(site, reason) {
      await sql`insert into chat_state (site) values (${site}) on conflict (site) do nothing`;
      const rows = await sql`
        update chat_state set status = 'paused', paused_at = now(), pause_reason = ${reason}
        where site = ${site} and status = 'active' returning site`;
      return rows.length > 0;
    },
  };
}
