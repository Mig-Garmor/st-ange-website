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
| `TURNSTILE_SECRET_KEY` | Verifies the visitor's first chat message, and every contact and quote form post once set |
| `CRON_SECRET` | Bearer token for the insight job |
| `IP_HASH_SALT` | Salt for `ip_hash` (raw IPs are never stored); also turns on the forms' limit of 5 posts per IP per hour. The daily job clears hashes older than 7 days |
| `CHAT_DAILY_CAP_EUR` | Daily spend cap, default 5 |
| `CHAT_LIMIT_PER_HOUR` | Local development only: overrides the 40 chat messages per IP per hour, `0` switches it off. Ignored on every Vercel deployment, which always uses 40 |
| `FORM_LIMIT_PER_HOUR` | Local development only: overrides the 5 form posts per IP per hour, `0` switches it off. Ignored on every Vercel deployment, which always uses 5 |
| `TURNSTILE_HOSTNAMES` | Optional, comma-separated, for example `stangeautoservice.com,www.stangeautoservice.com`. When set, a Turnstile token solved on any other hostname is refused. Leave it unset locally: Cloudflare's test keys report `example.com` |

### Choosing a model

The chat and the insight job both go through [OpenRouter](https://openrouter.ai), so any model there works: set `CHAT_MODEL` to its id from [openrouter.ai/models](https://openrouter.ai/models) and redeploy. No code change is needed.

- `openai/gpt-6-luna` is the recommended model: small, cheap ($0.10 in / $0.50 out per million tokens) and supports tool calls.
- `anthropic/claude-haiku-5.5` costs the same and is the Anthropic alternative.
- `qwen/qwen3.7-flash` is a very cheap paid option for testing ($0.03 in / $0.13 out per million tokens); its entry in `models` turns reasoning off.
- Free models end in `:free`, for example `nvidia/nemotron-3-ultra-550b-a55b:free` (worked in local testing on 2026-11-04; `google/gemma-4-31b-it:free` was rate-limited upstream). They are rate-limited and suited to testing, not the live site.
- When switching models on Vercel, replace an old `CHAT_MODEL` value such as `gpt-6-luna` with the full OpenRouter id (`openai/gpt-6-luna`): an unknown id makes the chat unavailable without an alert.

Pick a model that supports tools (the request card needs them). For `openai/`, `anthropic/` and `nvidia/` models the code asks for no hidden reasoning, so the 150-token reply budget goes to the answer; other models get no reasoning option, because some reject it ("Reasoning is mandatory"). A model that reasons by default and gets no option can use up the whole budget and reply with nothing. To change that for one model, add `reasoningEffort` (or `null` to send none) to its entry in `models` in `server/chatSettings.js`.

### Request card

As soon as a visitor wants a service, a quote or a booking, the bot calls the `proposeRequest` tool, which opens a 3-step form in the chat instead of asking for details in messages. The steps are "Your car" (service, vehicle, what's going on), "How we reach you" (name, phone) and "Almost done" (email, a review of the details, and the contact-confirmation tick box before Send request), with "Step N of 3" and a progress bar. Anything the visitor already typed is prefilled (a placeholder email such as "none" counts as missing, an unknown service becomes "Not sure yet", a valid phone is shown as `832-572-7121`), and the form opens at the first step that still needs something. Next checks that step with the same rules as `/api/chat-request`; the endpoint still decides, and a field it rejects sends the visitor back to that field's step. The local area codes suggested for a 7-digit number are `localAreaCodes` in `src/config/business.js`, shared by the chat, the form and the website forms.

### Service click tracking

With `VITE_HUB_PK` (the publishable key from Website Hub's Keys page) and `VITE_HUB_URL` (for example `https://website-hub-six.vercel.app`) set at build time, every page loads the hub's tracker (`async`, so it never holds up rendering). A click on a service card (`ServiceCard` with a `service` slug) is counted as the `service_click` tag with the service's slug; the hub's Tags page shows the counts per service. Without the variables nothing is loaded. Set them for Production only: the hub drops events from origins not on its Keys page, so a preview would only add dropped-event counts.

### Switching the bubble on

Set `VITE_CHAT_ENABLED=true` and `VITE_TURNSTILE_SITE_KEY` (the public Turnstile key) at build time; the bubble shows only when both are set. Otherwise it stays hidden and forms keep emailing as before.

The contact and quote forms send a Turnstile token whenever `VITE_TURNSTILE_SITE_KEY` is built in, and `/api/send-email` requires one whenever `TURNSTILE_SECRET_KEY` is set, so set both together or neither: a secret without the public key rejects every form post. Each gate stays off while its variable is unset, so the live forms keep working before the chat is configured.

### Commands

- `npm run db:migrate` applies pending migrations using `DATABASE_URL_UNPOOLED` (the direct URL). Run it after pulling a change that adds a migration, before that change is deployed: `003_abuse_counters.sql` adds the counters the chat now checks on every message, so a database without it makes the chat unavailable.
- `npm test` runs the unit tests; the database tests are skipped without `TEST_DATABASE_URL`.
- `npm run test:db` runs the database tests and the end-to-end chat test against `TEST_DATABASE_URL` (reads `.env.local`).

### Cost control

Every call asks OpenRouter for its real cost in USD, which is converted with `eurPerUsd` in `server/chatSettings.js` and added to `ai_usage_daily` with the token counts. A `:free` model reports a cost of 0, which counts. The `models` price table there is only a fallback for a call that reports no cost. If a call reports no cost and its model has no price either, the chat pauses itself and the alert email says so; add a price or change `CHAT_MODEL` before resuming.

The cap is checked before each call and charged after it, so a burst of simultaneous messages can pass it by the cost of those calls (cents at most). The per-conversation counters are atomic and cannot be overshot.

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
