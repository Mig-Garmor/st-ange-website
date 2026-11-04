# Chat assistant and lead tracking: design

Date: 2026-11-04
Status: draft, awaiting review

## Goal

Turn the site into a source of customer intelligence:

- Record every job or quote request the site sends, from any channel, with the service, the channel and the lead.
- Add a chat bubble that answers questions about the shop, promotes brakes and the new alignment machine when relevant, and collects name, phone, vehicle and (optionally) email to send a request to the shop.
- Store conversations and their insights (services asked about, intent, outcome, questions the site couldn't answer) in a database that MCP and a future dashboard can query.

Cost is kept low and hard-capped at €5 per day. The chat must not slow page loads.

## Scope

In this round:

1. **Data foundation.** Neon Postgres, the tables below, migrations, and recording the emails the existing contact and quote forms send.
2. **Chat.** The bubble and panel, the chat and request endpoints, the daily insight job, the daily cost cap with manual restart, Turnstile, playbook storage and loading, and a privacy page.
3. **MCP setup.** Connect Neon's official MCP server to Claude Code, read-only. Configuration only, no code.

Later rounds, not in this one:

- The dashboard, in a separate repository, with admin login. It reads the same tables.
- Playbook generation (see "Playbooks").
- Booking through the chat.
- Extracting `chat/` into a package. It is built as a self-contained module so this is a move, not a rewrite.
- Automatic data retention or deletion.

## Architecture

```
chat/                      site-agnostic chat module
  widget/
    ChatBubble.vue         the only part in the page bundle (< 5 KB gzipped)
    ChatPanel.vue          loaded with a dynamic import on first click
    RequestCard.vue        confirmation card for a request
  server/
    createChatHandler.js   POST /api/chat
    createRequestHandler.js  POST /api/chat-request
    createInsightsJob.js   daily summary job
    prompt.js              builds the instructions from settings
    limits.js              rate limits, daily cap, chat state
    turnstile.js           Turnstile token check
server/                    shared server code
  db/
    client.js              Neon serverless (HTTP) driver
    migrations/NNN_*.sql   numbered schema files
    migrate.js             `npm run db:migrate`, records applied files
    leads.js, requests.js, conversations.js, usage.js, playbooks.js
  email.js                 Brevo sending; recipient from LEAD_EMAIL_TO
api/                       thin Vercel functions that wire settings to handlers
  chat.js, chat-request.js, send-email.js, cron/chat-insights.js
src/chat-settings.js       St Ange's chat settings
```

Rules:

- `chat/` never imports from `src/` or names the business. Everything site-specific arrives in a settings object: business facts, knowledge text, featured services, service identifiers, prices per model, the cap, the quick-reply buttons.
- Handlers receive their dependencies (`db`, `email`, `ai`, `turnstile`) as arguments, so tests swap in fakes.
- Only `server/db/*` contains SQL. Everything else calls named functions such as `recordRequest()` or `saveMessage()`.
- `src/chat-settings.js` builds the bot's knowledge from `src/config/business.js` and `src/content/*.js`, the same files the pages use, so there is one source of truth for content. It includes services, intros, FAQs, hours, address, the rating and review count, but not full review texts.

Libraries added: `ai`, `@ai-sdk/openai`, `@ai-sdk/vue`, `@neondatabase/serverless`, and `vitest` (dev). No ORM.

## Data model

Every table has `site text not null` and `created_at timestamptz not null default now()`. Site is `st-ange` for this site; it keeps a future shared database possible.

**leads**

| Column | Notes |
|---|---|
| id | uuid |
| name, email, vehicle | text |
| phone | digits only |
| updated_at | |

Unique on `(site, phone)` where phone is set, and on `(site, lower(email))` where phone is empty. Writes use a single `INSERT … ON CONFLICT DO UPDATE`, so a returning customer updates their row rather than adding a duplicate.

**requests**: one row per request and per email sent.

| Column | Notes |
|---|---|
| id | uuid |
| idempotency_key | unique; sent by the client |
| source | `chat`, `contact_form` or `quote_form` |
| service | service slug or null |
| lead_id, conversation_id | conversation_id null for forms |
| subject, message, vehicle, page_url | text |
| email_status | `sent` or `failed` |
| email_error | text |

The row is written even when the email fails.

**conversations**

| Column | Notes |
|---|---|
| id | uuid generated in the browser |
| visitor_id | random id kept in localStorage |
| lead_id | null until contact details are given |
| page_url, ip_hash | ip_hash is a salted SHA-256 of the IP; the raw IP is never stored |
| message_count, last_message_at | |
| summary | text |
| services | text[] of service slugs |
| intent | `question`, `quote`, `booking`, `complaint`, `other` |
| unanswered | text[]: questions the knowledge couldn't answer |
| outcome | `request_sent`, `info_only`, `abandoned` |
| insights_claimed_at, insights_at | used by the insight job |

**messages**: `id`, `conversation_id`, `role` (`user`/`assistant`), `content`.

**ai_usage_daily**: one row per `(site, day)`: `input_tokens`, `cached_input_tokens`, `output_tokens`, `cost_eur`, `calls`. Updated with additive upserts.

**chat_state**: one row per site: `status` (`active`/`paused`), `paused_at`, `pause_reason`, `resumed_at`.

**playbooks**

| Column | Notes |
|---|---|
| id | uuid |
| intent | which kind of conversation it guides |
| version | int; unique per `(site, intent, version)` |
| content | markdown |
| conversation_count | how many conversations it was built from |
| active | at most one active version per `(site, intent)` |

Migrations are numbered SQL files applied in order by `npm run db:migrate`, which records each applied file in `schema_migrations`. The future dashboard repository depends on these tables, so changes are always new migrations, never edits to applied ones.

## Conversation flow

**Bubble.** Fixed in the bottom-right corner. On mobile it sits above `MobileCallBar` so the two never overlap. It renders only when the chat is configured (a build-time flag from the environment), so deploying without settings leaves the live site unchanged. It makes no network request until clicked.

**Panel.** Opens with a greeting, the line "We save this chat to help with your request. [Privacy]", and the quick replies *Wheel alignment*, *Brake repair*, *Get a quote*, *Hours & location*. Turnstile runs invisibly when the panel opens. Conversation id and messages are kept in sessionStorage, so the chat survives navigation and reloads within the tab.

**POST /api/chat**, in order:

1. Verify the Turnstile token.
2. Read `chat_state`. If paused, or today's `cost_eur` has reached the cap, return `offline`. The panel then shows the phone number and the quote form link.
3. Check limits: 500 characters per message, 20 messages per conversation, 40 messages per hour per `ip_hash`. Over a limit, return a friendly "please call us" reply without calling the AI.
4. Insert the conversation if new (`ON CONFLICT DO NOTHING`), save the user message, increment `message_count` in place.
5. Stream the reply (`streamText`, `maxOutputTokens` about 150). When it finishes, save the assistant message and record usage. If the day's cost crosses the cap, run `UPDATE chat_state SET status='paused' … WHERE status='active' RETURNING`. Only the request that flips the state sends the alert email.

If the database fails, the reply still streams and the error is logged. If the AI fails, the panel shows "Chat is unavailable, call 832-572-7121".

**Instructions**, ordered so the opening never changes between visitors and gets cached:

1. Rules and tone.
2. Business knowledge.
3. Active playbooks.
4. The parts that change: today's date, whether the shop is open now, the current page.
5. The conversation, sent in full and at most 20 messages.

`prompt_cache_key` is set to the site. Rules:

- Reply in 1–3 short sentences of plain text, like a person at the front desk.
- Ask one question at a time to understand the need, instead of listing information.
- Answer only from the knowledge given. Never invent prices, diagnoses or promises. When unsure, say so and offer the phone or a request.
- Mention the new alignment machine and brake services when relevant (new tires, suspension work, pulling, squealing, grinding), not otherwise.
- Politely decline topics unrelated to the shop or car service.
- When the person wants a service, ask for name, phone and vehicle (email optional), then propose a request.

**Request card.** The AI proposes a request through a tool with no server-side `execute`. The panel renders it as `RequestCard` (service, name, phone, vehicle, notes) with **Send request** and **Edit**. Only the click posts to `/api/chat-request`, with a client-generated idempotency key.

**POST /api/chat-request**:

1. Validate the fields.
2. Upsert the lead and link it to the conversation.
3. Insert the request with source `chat`. A repeated idempotency key returns the original result and sends nothing.
4. Email `LEAD_EMAIL_TO` with subject `[Chat] <Service> request from <Name>`, including the details and the conversation so far.
5. Store the email status and return it. The panel shows success, or the phone number on failure.

**Insight job.** A daily Vercel cron calls `/api/cron/chat-insights`, authorised with `CRON_SECRET`.

- It claims conversations idle for over an hour without insights: `UPDATE … SET insights_claimed_at = now() WHERE … RETURNING`, skipping claims under an hour old.
- For each, it calls `generateObject` with a schema. `services` is an enum of the real service slugs.
- It writes `summary`, `services`, `intent`, `unanswered`, `outcome` and `insights_at`.
- It respects the cap and records its usage like the chat does.

## Cost control

- The price per million tokens for each model (input, cached input, output) lives in the settings. Each call's usage is converted to euros and added to `ai_usage_daily`.
- The daily cap is €5 and is checked before every AI call.
- Pausing is sticky: it does not reset at midnight. Resume is manual: `UPDATE chat_state SET status='active', resumed_at=now() WHERE site='st-ange'`, run by hand or through MCP for now, and a dashboard button later.
- The alert email reports the time, the day's cost, the number of messages and the number of distinct visitors.
- Possible overshoot is limited to replies already in flight when the cap is hit (a few cents).
- Outside the code: prepaid OpenAI credit with auto-recharge off, as a hard backstop.
- Expected cost is roughly €0.001 per message with a small model and caching, so €5 is reached only through abuse.

## Concurrency

Each message runs in its own Vercel function. Neon's HTTP driver needs no connection pool, and Postgres handles parallel writes. Every place two requests could race is made safe in the statement itself:

| Race | Fix |
|---|---|
| Duplicate leads | Unique index plus upsert |
| A first message retried | Client-generated id plus `ON CONFLICT DO NOTHING` |
| Double-click on Send | Idempotency key |
| Counters and spend | Additive updates |
| Pausing | Conditional update, so a single alert |
| Insight runs | Claim before processing |

## Playbooks

This round:

- the table;
- loading every active playbook into the instructions, after the knowledge so caching still works;
- an empty table means no playbook text is added.

Next round, from the dashboard:

- A generator takes conversations of one intent with a successful outcome, for example `request_sent` for the lead playbook.
- It asks the AI for the conversation pattern that led there, and writes a new version, keeping old versions.
- Someone activates the version by hand.

If the playbooks grow large, the chat switches to loading only the playbook matching the conversation's intent.

## Existing forms

- `QuoteForm.vue` sends `source: "quote_form"` and the service slug.
- `ContactUsFormComponent.vue` sends `source: "contact_form"` and a service slug when its subject matches a service name.
- Both send an idempotency key.
- `api/send-email.js` validates input on the server, sends through `server/email.js`, then records the lead and the request with the email status.
- A database failure never blocks the email.
- Responses stay as they are today.

## Privacy

- A new `/privacy` page in plain language: what is collected (chat messages, contact details, page visited), why, who can see it, and how to ask for deletion (email or phone).
- Linked from the footer and from the chat panel.
- The text is a draft, not legal advice.

## Settings

| Variable | Notes |
|---|---|
| `DATABASE_URL` | From the Neon integration on Vercel. Development and preview use their own Neon branches. |
| `OPENAI_API_KEY`, `CHAT_MODEL` | |
| `LEAD_EMAIL_TO` | `stange-test@mailinator.com` in development and preview; `st.angeautos@gmail.com` in production |
| `BREVO_API_KEY` | Existing |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | |
| `CRON_SECRET`, `IP_HASH_SALT` | |
| `CHAT_DAILY_CAP_EUR` | Default 5 |

## Testing

Vitest unit tests with fake dependencies:

- phone normalisation and lead matching;
- the instructions contain every service, the business details and the active playbooks, with the unchanging part first;
- request validation and idempotency;
- rate limits;
- the cap: below, crossing (pauses once, one alert) and paused (no AI call);
- the chat and request handlers when the email, the database or the AI fails;
- the insight schema rejects unknown service slugs.

Migrations are run against a Neon development branch.

End to end on localhost with `vercel dev`:

- ask about alignment;
- give details;
- send the request;
- check the Mailinator inbox and the rows in `leads`, `requests`, `conversations` and `messages`;
- submit both existing forms and check their rows;
- force the cap low, confirm the chat pauses with one alert, and resume it.

Page speed: Lighthouse before and after on the homepage and a service page. The bubble is under 5 KB gzipped, and the panel chunk loads only on click.

## Rollout

1. Build on a feature branch.
2. Verify on localhost, then on a Vercel preview using Mailinator.
3. Merge.
4. The live site deploys from the fork on another account. Its Vercel project needs its own Neon integration and settings, added by that account's owner. Until then the bubble stays hidden and the forms behave as they do today.
5. After merge, connect Neon's MCP server to Claude Code, read-only.

## Open items

- Which model `CHAT_MODEL` names, chosen at implementation time as OpenAI's cheapest current small model that supports tool calls. Its prices go in the settings.
- Privacy page wording, reviewed by the owner.
