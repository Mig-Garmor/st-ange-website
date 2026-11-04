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
| `OPENROUTER_API_KEY` | OpenRouter key for chat and insights |
| `CHAT_MODEL` | OpenRouter model id, required; recommended `openai/gpt-6-luna` (see Choosing a model) |
| `LEAD_EMAIL_TO` | Where request and alert emails go |
| `BREVO_API_KEY` | Email sending |
| `TURNSTILE_SECRET_KEY` | Verifies the visitor's first message |
| `CRON_SECRET` | Bearer token for the insight job |
| `IP_HASH_SALT` | Salt for `ip_hash` (raw IPs are never stored) |
| `CHAT_DAILY_CAP_EUR` | Daily spend cap, default 5 |

### Choosing a model

The chat and the insight job both go through [OpenRouter](https://openrouter.ai), so any model there works: set `CHAT_MODEL` to its id from [openrouter.ai/models](https://openrouter.ai/models) and redeploy. No code change is needed.

- `openai/gpt-6-luna` is the recommended model: small, cheap ($0.10 in / $0.50 out per million tokens) and supports tool calls.
- `anthropic/claude-haiku-5.5` costs the same and is the Anthropic alternative.
- Free models end in `:free`, for example `nvidia/nemotron-3-ultra-550b-a55b:free` (worked in local testing on 2026-11-04; `google/gemma-4-31b-it:free` was rate-limited upstream). They are rate-limited and suited to testing, not the live site.
- When switching models on Vercel, replace an old `CHAT_MODEL` value such as `gpt-6-luna` with the full OpenRouter id (`openai/gpt-6-luna`): an unknown id makes the chat unavailable without an alert.

Pick a model that supports tools (the request card needs them). For `openai/`, `anthropic/` and `nvidia/` models the code asks for no hidden reasoning, so the 150-token reply budget goes to the answer; other models get no reasoning option, because some reject it ("Reasoning is mandatory"). A model that reasons by default and gets no option can use up the whole budget and reply with nothing. To change that for one model, add `reasoningEffort` (or `null` to send none) to its entry in `models` in `server/chatSettings.js`.

### Switching the bubble on

Set `VITE_CHAT_ENABLED=true` and `VITE_TURNSTILE_SITE_KEY` (the public Turnstile key) at build time; the bubble shows only when both are set. Otherwise it stays hidden and forms keep emailing as before.

### Commands

- `npm run db:migrate` applies pending migrations using `DATABASE_URL_UNPOOLED` (the direct URL). Run it after pulling the change that adds `002_resume_allowance.sql`; the resume SQL below needs that column.
- `npm test` runs the unit tests; the database tests are skipped without `TEST_DATABASE_URL`.
- `npm run test:db` runs the database tests and the end-to-end chat test against `TEST_DATABASE_URL` (reads `.env.local`).

### Cost control

Every call asks OpenRouter for its real cost in USD, which is converted with `eurPerUsd` in `server/chatSettings.js` and added to `ai_usage_daily` with the token counts. A `:free` model reports a cost of 0, which counts. The `models` price table there is only a fallback for a call that reports no cost. If a call reports no cost and its model has no price either, the chat pauses itself and the alert email says so; add a price or change `CHAT_MODEL` before resuming.

Prompt caching depends on the model and the provider behind it. OpenAI models cache the unchanging start of the instructions automatically; for `anthropic/` models the code marks that start as a cache breakpoint. Caches last minutes, so they mostly help within one conversation and between chats close together.

The chat pauses itself when the day's spend reaches the cap and stays paused until resumed by hand:

```sql
UPDATE chat_state SET status='active', resumed_at=now(), resume_cost_eur=(SELECT coalesce(sum(cost_eur),0) FROM ai_usage_daily WHERE site='st-ange' AND day=(now() AT TIME ZONE 'America/Chicago')::date) WHERE site='st-ange';
```

Resuming gives the chat a fresh cap from that moment: the rest of that Chicago day it may spend another full cap on top of what was spent before the resume. From the next day the normal daily cap applies again.

Keep prepaid OpenRouter credit with auto top-up off as a hard backstop.

### Insight job

A Vercel cron (`vercel.json`, daily at 10:00 UTC) calls `/api/cron/chat-insights` with `Authorization: Bearer $CRON_SECRET`. It summarises conversations idle for over 60 minutes.

### Production

The live site deploys from a fork on another Vercel account. That project needs its own Neon database, `DATABASE_URL` and the other variables above, then `npm run db:migrate` against it. Until then the bubble stays hidden and forms keep emailing.

### Neon MCP

The Neon plugin's MCP server is installed for Claude Code. Authorise it from `/mcp`, and keep it read-only for querying.

### Before going live

- [ ] Run `vercel link`, then `vercel dev`, and walk through chat, request card and both forms in the browser.
- [ ] Use `LEAD_EMAIL_TO=stange-test@mailinator.com` and check the `[Chat] ...` and form emails arrive.
- [ ] Use real keys: OpenRouter with prepaid credit and auto top-up off, plus Turnstile site and secret keys.
- [ ] Set `CHAT_DAILY_CAP_EUR=0.0001`, send a message, confirm one alert email and the offline view, then resume with the SQL above.
- [ ] Check the bubble sits above the mobile call bar at 375x812.
- [ ] Run the insight job by hand with curl and the cron secret.
- [ ] Compare Lighthouse (mobile) on `/` and `/services/car-alignment` before and after; no more than a 2 point Performance drop.
