# Vue 3 + Vite

This template should help get you started developing with Vue 3 in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about IDE Support for Vue in the [Vue Docs Scaling up Guide](https://vuejs.org/guide/scaling-up/tooling.html#ide-support).

## Chat and lead tracking

The site has an AI chat bubble and records every lead and request in Neon Postgres. Server code lives in `api/`, `server/` and `chat/server/`; SQL lives only in `server/db/`.

### Environment variables

Server (Vercel project settings and `.env.local`; see `.env.example`):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Pooled Neon URL used at runtime |
| `DATABASE_URL_UNPOOLED` | Direct Neon URL used by `npm run db:migrate` |
| `TEST_DATABASE_URL` | A separate Neon branch for the DB tests; the tests refuse to run if it matches `DATABASE_URL` |
| `OPENAI_API_KEY` | OpenAI key for chat and insights |
| `CHAT_MODEL` | Model id; must have a price in `server/chatSettings.js` |
| `LEAD_EMAIL_TO` | Where request and alert emails go |
| `BREVO_API_KEY` | Email sending |
| `TURNSTILE_SECRET_KEY` | Verifies the visitor's first message |
| `CRON_SECRET` | Bearer token for the insight job |
| `IP_HASH_SALT` | Salt for `ip_hash` (raw IPs are never stored) |
| `CHAT_DAILY_CAP_EUR` | Daily spend cap, default 5 |

### Switching the bubble on

Set `VITE_CHAT_ENABLED=true` and `VITE_TURNSTILE_SITE_KEY` (the public Turnstile key) at build time; the bubble shows only when both are set. Otherwise it stays hidden and forms keep emailing as before.

### Commands

- `npm run db:migrate` applies pending migrations using `DATABASE_URL_UNPOOLED` (the direct URL).
- `npm test` runs the unit tests; the database tests are skipped without `TEST_DATABASE_URL`.
- `npm run test:db` runs the database tests and the end-to-end chat test against `TEST_DATABASE_URL` (reads `.env.local`).

### Cost control

The chat pauses itself when the day's spend reaches the cap and stays paused until resumed by hand:

```sql
UPDATE chat_state SET status='active', resumed_at=now() WHERE site='st-ange'
```

Keep prepaid OpenAI credit with auto-recharge off as a hard backstop.

### Insight job

A Vercel cron (`vercel.json`, daily at 10:00 UTC) calls `/api/cron/chat-insights` with `Authorization: Bearer $CRON_SECRET`. It summarises conversations idle for over 60 minutes.

### Production

The live site deploys from a fork on another Vercel account. That project needs its own Neon database, `DATABASE_URL` and the other variables above, then `npm run db:migrate` against it. Until then the bubble stays hidden and forms keep emailing.

### Neon MCP

The Neon plugin's MCP server is installed for Claude Code. Authorise it from `/mcp`, and keep it read-only for querying.

### Before going live

- [ ] Run `vercel link`, then `vercel dev`, and walk through chat, request card and both forms in the browser.
- [ ] Use `LEAD_EMAIL_TO=stange-test@mailinator.com` and check the `[Chat] ...` and form emails arrive.
- [ ] Use real keys: OpenAI with prepaid credit and auto-recharge off, plus Turnstile site and secret keys.
- [ ] Set `CHAT_DAILY_CAP_EUR=0.0001`, send a message, confirm one alert email and the offline view, then resume with the SQL above.
- [ ] Check the bubble sits above the mobile call bar at 375x812.
- [ ] Run the insight job by hand with curl and the cron secret.
- [ ] Compare Lighthouse (mobile) on `/` and `/services/car-alignment` before and after; no more than a 2 point Performance drop.
