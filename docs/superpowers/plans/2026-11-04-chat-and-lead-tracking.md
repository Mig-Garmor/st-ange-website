# Chat Assistant and Lead Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record every lead and request in Neon, and add a lazy-loaded chat bubble that answers from the site's content, proposes requests through a confirmation card, captures insights daily and stops itself at €5 a day.

**Architecture:** Three layers.
- `server/` holds the shared database and email code. It is the only place with SQL and Brevo calls.
- `chat/` is a site-agnostic module: Vue widget plus server handler factories that receive settings and dependencies.
- `api/` and `src/` wire St Ange's settings into both.

New endpoints are Vercel Web handlers (`export async function POST(request)`), so tests call them with a `Request` and read a `Response`.

**Tech Stack:**
- Vue 3, vite-ssg and Tailwind 3 (existing), Vercel functions (Node 24).
- `@neondatabase/serverless`, plain SQL.
- `ai`, `@ai-sdk/openai`, `@ai-sdk/vue` (Vercel AI SDK).
- `@sendinblue/client` (existing).
- Cloudflare Turnstile.
- Vitest.

**Spec:** `docs/superpowers/specs/2026-11-04-chat-and-lead-tracking-design.md`

## Global Constraints

**Git**
- Work on branch `feature/chat-lead-tracking`, cut from `main`.
- Each task ends with a **Checkpoint** step. Commit only if the user has asked for commits in this run; otherwise leave the changes uncommitted and report the files. Never push, open a PR or merge unless the user asks.
- If you commit: personal identity (includeIf already set), and the message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

**Data**
- Every table has `site text not null` and `created_at timestamptz not null default now()`. The St Ange site value is `st-ange`.
- Only `server/db/*` contains SQL.
- `chat/` never imports from `src/` and never names the business.
- Applied migrations are never edited; changes are new numbered files.
- Phone numbers are stored as 10 digits (strip non-digits, then a leading `1` when 11 digits).
- Raw IP addresses are never stored: `ip_hash` is SHA-256 of `IP_HASH_SALT + ip`, as hex.
- The day for the cap and usage is the calendar date in `America/Chicago`.

**Limits and cost**

| Setting | Value |
|---|---|
| Characters per message | 500 |
| User messages per conversation | 20 |
| User messages per `ip_hash` per hour | 40 |
| `maxOutputTokens` | 150 |
| Daily cap | `CHAT_DAILY_CAP_EUR`, default 5 |

- Pausing is sticky until manually resumed.
- The insight job claims conversations idle for over 60 minutes, and re-claims a claim older than 60 minutes.

**Fixed copy**
- Chat email subject: `[Chat] <Service name> request from <Name>`. Use `Service` when no service is set.
- Panel notice: `We save this chat to help with your request.`, followed by a link to `/privacy`.
- Quick replies: `Wheel alignment`, `Brake repair`, `Get a quote`, `Hours & location`.
- AI unavailable: `Chat is unavailable right now. Call us at 832-572-7121.`
- Offline (paused or capped): `Our chat is offline right now. Call us at 832-572-7121 or send a quote request.`
- Over a limit: `Let's pick this up by phone: call us at 832-572-7121.`

**Environment variables**
- Server: `DATABASE_URL`, `OPENAI_API_KEY`, `CHAT_MODEL`, `LEAD_EMAIL_TO`, `BREVO_API_KEY`, `TURNSTILE_SECRET_KEY`, `CRON_SECRET`, `IP_HASH_SALT`, `CHAT_DAILY_CAP_EUR`.
- Build time: `VITE_CHAT_ENABLED` (`"true"` shows the bubble) and `VITE_TURNSTILE_SITE_KEY`.

**Performance**
- The bubble adds under 5 KB gzipped to the entry bundle.
- `ChatPanel` is a separate chunk loaded on first click.
- Nothing chat-related makes a network request before the click.

**AI SDK**
- Install the current major version and check its docs before writing Tasks 7 and 10. This plan uses AI SDK 5 names: `streamText`, `generateObject`, `createUIMessageStream`, `createUIMessageStreamResponse`, `Chat` and `DefaultChatTransport` from `@ai-sdk/vue`, `providerOptions.openai.promptCacheKey`, and `usage.cachedInputTokens`.
- If a name changed, use its replacement and note it in the Checkpoint.

## Review Focus

1. **Same phone, two submissions at once** (a form and the chat). Expect exactly one `leads` row. Covered by a test in Task 2.
2. **Double-click on Send request, or a network retry of a form post.** Expect one `requests` row and one email. Covered by tests in Tasks 2 and 3.
3. **Several replies finishing together cross the €5 cap.** Expect the state to be `paused` and exactly one alert email. Covered by tests in Tasks 2 and 6.
4. **A visitor keeps chatting after a request card was shown but not sent**, or the client sends tampered history. Expect no AI provider error and no client-supplied assistant text in the AI call: the model history is built from stored plain-text messages, falling back to the client's text only when the database fails. Covered by a test in Task 7.
5. **Phone formats.** `+1 (832) 572-7121`, `832.572.7121` and `8325727121` must all match the same lead. `572-7121` and `+44 20 7946 0958` must be rejected with a validation error. Covered by tests in Tasks 2 and 3.

---

### Task 1: Database foundation

**Files:**
- Create: `server/db/client.js`, `server/db/migrate.js`, `server/db/migrations/001_init.sql`, `vitest.config.js`, `.env.example`, `server/db/migrate.test.js`
- Modify: `package.json` (dependencies and scripts), `.gitignore` (add `.env.local`, `.vercel`)

**Interfaces:**
- Produces:
  - `getSql(): NeonQueryFunction`: a lazy singleton built from `process.env.DATABASE_URL`. Throws `Error("DATABASE_URL is not set")` when missing.
  - `migrate(sql): Promise<string[]>`: returns the files it applied.
  - Scripts:
    - `npm run db:migrate`: `node --env-file-if-exists=.env.local server/db/migrate.js`
    - `npm test`: `vitest run`
    - `npm run test:db`: `node --env-file-if-exists=.env.local node_modules/vitest/vitest.mjs run server/db`
  - `TEST_DATABASE_URL`: a Neon development branch. Database tests use `describe.skipIf(!process.env.TEST_DATABASE_URL)`.

- [ ] **Step 1: Create the branch and install**

```bash
cd ~/personal/st-ange-website && git checkout main && git checkout -b feature/chat-lead-tracking
npm install @neondatabase/serverless && npm install -D vitest
```

- [ ] **Step 2: Write `001_init.sql`.** It is the contract the dashboard repository will read:

```sql
create extension if not exists pgcrypto;

create table leads (
  id uuid primary key default gen_random_uuid(),
  site text not null, name text, phone text, email text, vehicle text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index leads_site_phone on leads (site, phone) where phone is not null;
create unique index leads_site_email on leads (site, lower(email)) where phone is null and email is not null;

create table conversations (
  id uuid primary key, site text not null, visitor_id text not null,
  lead_id uuid references leads(id), page_url text, ip_hash text,
  verified_at timestamptz, message_count int not null default 0, last_message_at timestamptz,
  summary text, services text[], intent text, unanswered text[], outcome text,
  insights_claimed_at timestamptz, insights_at timestamptz,
  created_at timestamptz not null default now()
);
create index conversations_ip_recent on conversations (ip_hash, last_message_at);

create table messages (
  id uuid primary key default gen_random_uuid(), site text not null,
  conversation_id uuid not null references conversations(id),
  role text not null check (role in ('user','assistant')), content text not null,
  created_at timestamptz not null default now()
);
create index messages_conversation on messages (conversation_id, created_at);

create table requests (
  id uuid primary key default gen_random_uuid(), site text not null,
  idempotency_key text not null unique,
  source text not null check (source in ('chat','contact_form','quote_form')),
  service text, lead_id uuid references leads(id), conversation_id uuid references conversations(id),
  subject text, message text, vehicle text, page_url text,
  email_status text check (email_status in ('sent','failed')), email_error text,
  created_at timestamptz not null default now()
);

create table ai_usage_daily (
  site text not null, day date not null,
  input_tokens bigint not null default 0, cached_input_tokens bigint not null default 0,
  output_tokens bigint not null default 0, cost_eur numeric(10,4) not null default 0,
  calls int not null default 0, created_at timestamptz not null default now(),
  primary key (site, day)
);

create table chat_state (
  site text primary key, status text not null default 'active' check (status in ('active','paused')),
  paused_at timestamptz, pause_reason text, resumed_at timestamptz,
  created_at timestamptz not null default now()
);

create table playbooks (
  id uuid primary key default gen_random_uuid(), site text not null, intent text not null,
  version int not null, content text not null, conversation_count int not null default 0,
  active boolean not null default false, created_at timestamptz not null default now(),
  unique (site, intent, version)
);
create unique index playbooks_one_active on playbooks (site, intent) where active;
```

Note on `conversations.message_count`: it counts **user** messages only, because the 20-message limit is per user message. Add this as a SQL comment on the column.

- [ ] **Step 3: Write the failing test** `server/db/migrate.test.js`, skipped without `TEST_DATABASE_URL`:
  - `applies 001_init.sql once`: the first `migrate(sql)` returns `["001_init.sql"]`, the second returns `[]`.
  - `schema_migrations lists the file`.
  - Before running, drop all of the tables above plus `schema_migrations`, using `drop table if exists … cascade`, so the test is repeatable.

- [ ] **Step 4: Run.** `TEST_DATABASE_URL=<dev branch url> npx vitest run server/db/migrate.test.js`. Expect a failure because the module is missing.

- [ ] **Step 5: Implement `migrate(sql)`.**
  - Create `schema_migrations(name text primary key, applied_at timestamptz default now())`.
  - Read `migrations/*.sql` sorted by name, skipping files already listed.
  - Run each file's statements and its insert into `schema_migrations` in one `sql.transaction`. Split the file on `;` at line ends; the files contain no functions.
  - When run as a script, log the applied files and exit with a non-zero code on error.

- [ ] **Step 6: Run the test.** Expect PASS. Then `npm test`: database tests skip without the variable, and the run exits 0.

- [ ] **Step 7: Write `.env.example`** listing every variable from Global Constraints. Add `TEST_DATABASE_URL`, commented as "a Neon dev branch, never production".

- [ ] **Step 8: Checkpoint.**

---

### Task 2: Data access functions

**Files:**
- Create: `server/db/leads.js`, `server/db/requests.js`, `server/db/conversations.js`, `server/db/usage.js`, `server/db/playbooks.js`, `server/db/index.js`, `server/phone.js`
- Test: `server/phone.test.js`, `server/db/db.test.js` (needs a database)

**Interfaces:**
- Consumes: `getSql()` and `migrate(sql)` from Task 1.
- Produces:
  - `normalizePhone(input: string): string | null`, in `server/phone.js`. Returns 10 digits, or `null` when the input isn't a US number.
  - `createDb(sql)` (`server/db/index.js`) returns an object with:

    **Leads**
    - `upsertLead({ site, name, phone, email, vehicle }) → Promise<{ id }>`. `phone` is already normalised or null. On conflict, update non-null fields and `updated_at`.

    **Requests**
    - `recordRequest({ site, idempotencyKey, source, service, leadId, conversationId, subject, message, vehicle, pageUrl }) → Promise<{ id, duplicate: boolean, emailStatus: string | null }>`. Uses `insert … on conflict (idempotency_key) do nothing returning`. On a duplicate, it selects the existing row.
    - `setRequestEmailStatus(id, { status, error }) → Promise<void>`

    **Conversations and messages**
    - `ensureConversation({ site, id, visitorId, pageUrl, ipHash, verified }) → Promise<{ id, verifiedAt, messageCount }>`. Inserts with `on conflict (id) do nothing`, then selects. `verified` sets `verified_at = now()` only on insert.
    - `saveMessage({ site, conversationId, role, content }) → Promise<void>`. For the `user` role it also runs `message_count = message_count + 1, last_message_at = now()`.
    - `getMessages(conversationId) → Promise<{ role, content }[]>`, oldest first.
    - `linkLead(conversationId, leadId) → Promise<void>`
    - `userMessagesLastHour(ipHash) → Promise<number>`

    **Usage and chat state**
    - `addUsage({ site, day, inputTokens, cachedInputTokens, outputTokens, costEur }) → Promise<{ costEur: number }>`. An additive upsert; returns the day's new total.
    - `getUsage(site, day) → Promise<{ costEur: number, calls: number }>`
    - `getChatState(site) → Promise<{ status, pausedAt, pauseReason }>`. Inserts the default row when it is missing.
    - `pauseChat(site, reason) → Promise<boolean>`: `update … set status='paused', paused_at=now(), pause_reason=$2 where site=$1 and status='active' returning site`. Returns true only for the caller that flipped it.
    - `dayStats(site, day) → Promise<{ messages: number, visitors: number }>`: user messages and distinct `visitor_id` for that Chicago date.

    **Insights**
    - `claimForInsights(site, limit) → Promise<{ id, transcript: string }[]>`. Claims idle conversations that have no `insights_at` and either no claim or a claim older than 60 minutes. Sets `insights_claimed_at = now()` in the same `update … returning`.
    - `saveInsights(id, { summary, services, intent, unanswered, outcome }) → Promise<void>`. Also sets `insights_at`.

    **Playbooks**
    - `activePlaybooks(site) → Promise<{ intent, content }[]>`

- [ ] **Step 1: Write the failing tests** `server/phone.test.js`:
  - These all return `"8325727121"`: `+1 (832) 572-7121`, `832.572.7121`, `8325727121`, `1-832-572-7121`.
  - These return `null`: `572-7121`, `+44 20 7946 0958`, `""`.

- [ ] **Step 2: Write the failing tests** `server/db/db.test.js`. It runs `migrate` in `beforeAll` and uses a random `site` per test run.
  - `upsertLead in parallel for the same phone makes one row`: `Promise.all` of 5 upserts with differently formatted, normalised numbers. Expect one row, and the last non-null `vehicle` kept.
  - `upsertLead matches on email when phone is null`.
  - `recordRequest with the same idempotency key twice returns duplicate true and one row`.
  - `pauseChat called 5 times in parallel returns true exactly once`.
  - `addUsage in parallel sums every cost`: 10 parallel adds of 0.01 total 0.10.
  - `saveMessage counts only user messages`.
  - `claimForInsights skips conversations active in the last hour and does not return the same conversation to a second claim`.
  - `getChatState creates an active row`.
  - `activePlaybooks returns only active versions`.

- [ ] **Step 3: Run.** `npx vitest run server/phone.test.js` and `npm run test:db`. Expect failures because the modules are missing.

- [ ] **Step 4: Implement `normalizePhone` and each module.** `createDb` spreads the module factories, each taking `sql`.

- [ ] **Step 5: Run both commands again.** Expect PASS.

- [ ] **Step 6: Checkpoint.**

---

### Task 3: Request service, email and the existing forms

**Files:**
- Create: `server/email.js`, `server/requests.js`, `server/validate.js`, `server/requests.test.js`, `server/sendEmailHandler.js`, `server/sendEmailHandler.test.js`
- Modify: `api/send-email.js` (rewrite as a thin Web handler), `src/components/forms/QuoteForm.vue`, `src/components/forms/ContactUsFormComponent.vue`, `src/pages/services/[slug].vue:124`

**Interfaces:**
- Consumes: `createDb(sql)` and `normalizePhone` from Task 2.
- Produces:
  - `createEmail({ apiKey, to, sender }) → { send({ subject, text }): Promise<void> }`. Throws on a Brevo error. `sender` stays `st.angeautos@gmail.com`.
  - `validateLead({ name, phone, email, vehicle }, { requireVehicle, requireEmail }) → { ok: boolean, errors: Record<string,string>, lead: { name, phone, email, vehicle } }`.
    - Phone is required and normalised.
    - Email is optional unless `requireEmail` is set.
    - It reuses the validators in `src/modules/validate.js` through a relative import.
  - `createRequestService({ db, email, site, logger = console }) → { submit(input): Promise<{ emailStatus: 'sent' | 'failed', duplicate: boolean }> }`.
    - `input`: `{ source, service, idempotencyKey, lead, subject, text, message, vehicle, pageUrl, conversationId }`.
    - The order: upsert the lead (`db.upsertLead`), then `recordRequest`. On a duplicate, return the stored status without sending. Otherwise `email.send`, then `setRequestEmailStatus`.
    - If any database call throws, log it and still send the email; the result reflects the email.
  - `handleSendEmail(body, { requests }) → { status: number, json: object }`:
    - 400 with `{ error, errors }` on invalid input;
    - 200 with `{ message: "Email sent successfully" }` when sent;
    - 500 with `{ error: "Email failed" }` when the email failed.
    - The body is `{ data: { subject, name, email, phone, message, source, service, idempotencyKey, pageUrl } }`. `source` defaults to `contact_form`, and the key defaults to `crypto.randomUUID()` for old clients.

- [ ] **Step 1: Write the failing tests** `server/requests.test.js`, with fake `db` and `email` objects recording their calls:
  - `sends the email and records sent`;
  - `records failed with the error when the email throws`;
  - `duplicate idempotency key sends no email`;
  - `email still sends when db.upsertLead throws`;
  - `email still sends when db.recordRequest throws`.

- [ ] **Step 2: Write the failing tests** `server/sendEmailHandler.test.js`:
  - `400 for phone 572-7121`;
  - `200 for a valid contact form`;
  - `quote_form with service car-alignment is passed through`;
  - `missing source defaults to contact_form`.

- [ ] **Step 3: Run** `npx vitest run server/requests.test.js server/sendEmailHandler.test.js`. Expect FAIL.

- [ ] **Step 4: Implement the four modules.** The email text keeps today's format: `Name: …\nMessage: …\nFrom: …\nPhone: …`.

- [ ] **Step 5: Rewrite `api/send-email.js`** as `export async function POST(request)`. It parses JSON, builds the dependencies, calls `handleSendEmail` and returns `Response.json(json, { status })`.
  - Dependencies: `createDb(getSql())`, and `createEmail` with `to: process.env.LEAD_EMAIL_TO ?? "st.angeautos@gmail.com"`.
  - When `DATABASE_URL` is unset, use a `db` whose functions throw. The request service then logs and still emails, so production without Neon behaves as today.

- [ ] **Step 6: Update the forms.**
  - `QuoteForm.vue` gets a new prop `service` (a slug). It sends `source: "quote_form"`, `service`, `pageUrl: location.href`, and one `idempotencyKey` per submit attempt: a `crypto.randomUUID()` created when the form becomes dirty, and reset after success.
  - `[slug].vue` passes `:service="service.slug"`.
  - `ContactUsFormComponent.vue` sends `source: "contact_form"`, `service`: the slug whose `name` equals `subject` (looked up in `services` from `@/config/business`, otherwise null), and `pageUrl` plus an `idempotencyKey` as above.

- [ ] **Step 7: Run** `npm test`, expecting PASS. Then run `npm run build`, expecting success.

- [ ] **Step 8: Checkpoint.**

---

### Task 4: Shared content importable on the server, and the chat instructions

**Files:**
- Modify: `src/content/services.js:1`, `src/content/home.js:1-3`. Switch the `@/…` imports to relative `../config/business.js`, `./relocation.js` and `./reviews.js`, and add the same one-line comment `llmsTxt.js` has.
- Create: `server/chatSettings.js` (St Ange's server-side settings), `chat/server/prompt.js`, `chat/server/prompt.test.js`, `server/chatSettings.test.js`

**Interfaces:**
- Produces:
  - `chatServerSettings` (`server/chatSettings.js`):
    - `{ site: "st-ange", timeZone: "America/Chicago", phoneDisplay: "832-572-7121", knowledge: string, featured: string, services: { slug, name }[], limits: { maxChars: 500, maxUserMessages: 20, perHour: 40 }, maxOutputTokens: 150, dailyCapEur: Number(process.env.CHAT_DAILY_CAP_EUR ?? 5), models: { [modelId]: { inputUsd, cachedInputUsd, outputUsd } }, eurPerUsd: number, hours: business.hours }`.
    - `knowledge` comes from `servicePages` (name, summary, intro, signs, process, feature, FAQs), `business` (address, phone, hours, ZIPs), `faqs` from `home.js`, `relocationFaq`, and the rating and count from `googleReviews`. No review texts.
    - `featured` tells the AI to mention the new alignment machine and brake services when relevant. List the triggers: new tires, suspension work, pulling, crooked wheel, squeal, grind, soft pedal.
    - `models`: the per-million-token USD prices for the model picked in Task 7.
  - `buildInstructions(settings, { playbooks, now: Date, pageUrl }) → { stable: string, variable: string }`. The system prompt is `stable + "\n\n" + variable`.
    - `stable` holds the rules (from the spec's Instructions section), then `settings.knowledge`, `settings.featured`, then the playbooks as `## Playbook: <intent>` sections. With no playbooks, there are no playbook headings.
    - `variable` holds the date and time in `settings.timeZone`, `Open now` or `Closed now` worked out from `settings.hours`, and `Current page: <pageUrl>`.

- [ ] **Step 1: Write the failing tests.**
  - `prompt.test.js`:
    - `stable is identical for different now and pageUrl`;
    - `stable contains every service name and the phone`;
    - `stable includes active playbooks after knowledge`;
    - `no playbook heading when none`;
    - `variable says Open now on a Monday at 10:00 Chicago and Closed now on Sunday`.
  - `chatSettings.test.js`:
    - `knowledge mentions 108 Schilling Ave and every service`;
    - `knowledge contains no review text`: check that no `allReviews[i].text` longer than 40 characters appears.

- [ ] **Step 2: Run** `npx vitest run chat/server/prompt.test.js server/chatSettings.test.js`. Expect FAIL.

- [ ] **Step 3: Switch the content imports to relative paths, then implement both modules.**

- [ ] **Step 4: Prove Node resolves the content without Vite aliases:**

```bash
node -e "import('./server/chatSettings.js').then(m => console.log(m.chatServerSettings.knowledge.length))"
```

Expect a number above 3000, and no `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 5: Run the tests** (expect PASS), then `npm run build` (expect success; the pages are unchanged).

- [ ] **Step 6: Checkpoint.**

---

### Task 5: Turnstile and IP hashing

**Files:**
- Create: `chat/server/turnstile.js`, `chat/server/ipHash.js`, `chat/server/turnstile.test.js`

**Interfaces:**
- Produces:
  - `createTurnstile({ secret, fetch = globalThis.fetch }) → { verify(token, ip): Promise<boolean> }`. It POSTs form data `secret`, `response` and `remoteip` to `https://challenges.cloudflare.com/turnstile/v0/siteverify`. It returns `success === true`, and false on a missing token or a network error.
  - `hashIp(ip, salt) → string`: hex SHA-256 of `salt + ip`.
  - `clientIp(request) → string`: the first entry of `x-forwarded-for`, or `"unknown"`.

- [ ] **Step 1: Write the failing tests**, using a fake `fetch`:
  - `true on success`;
  - `false on success:false`;
  - `false without token, and fetch not called`;
  - `false when fetch rejects`;
  - `hashIp is stable and differs by salt`.

- [ ] **Step 2: Run, expecting FAIL. Implement. Run, expecting PASS.**

- [ ] **Step 3: Checkpoint.**

---

### Task 6: Cost tracking, limits and the daily cap

**Files:**
- Create: `chat/server/cost.js`, `chat/server/limits.js`, `chat/server/limits.test.js`

**Interfaces:**
- Consumes: the `db` functions from Task 2 (`getChatState`, `getUsage`, `addUsage`, `pauseChat`, `dayStats`, `userMessagesLastHour`), and `chatServerSettings` from Task 4.
- Produces:
  - `costEur(usage, price, eurPerUsd) → number`. `usage` is `{ inputTokens, cachedInputTokens, outputTokens }`, and uncached input is `inputTokens - cachedInputTokens`.
  - `chicagoDay(now: Date, timeZone) → "YYYY-MM-DD"`.
  - `isAvailable({ db, settings, now }) → Promise<boolean>`: false when paused or when today's `costEur` is at or above `settings.dailyCapEur`.
  - `checkLimits({ db, settings, conversation, ipHash, text }) → Promise<{ ok: true } | { ok: false, reason: 'too_long' | 'conversation_limit' | 'hourly_limit' }>`
  - `recordUsage({ db, email, settings, model, usage, now }) → Promise<void>`.
    - Adds the cost.
    - If the new total is at or above the cap, calls `pauseChat(site, "daily cap reached")`.
    - Only when that returns true, sends the alert with subject `Chat paused: daily cap reached`. The body gives the Chicago time, the day's €, messages and visitors, plus the resume SQL from the spec.
  - Throws `Error("No price for model <id>")` when `settings.models[model]` is missing. The chat must never run untracked.

- [ ] **Step 1: Write the failing tests:**
  - `costEur counts cached input at the cached price`;
  - `chicagoDay of 2026-11-05T04:30Z is 2026-11-04`;
  - `unavailable when paused`;
  - `unavailable at the cap`;
  - `available just under the cap`;
  - `too_long at 501 characters`;
  - `conversation_limit when messageCount is 20`;
  - `hourly_limit at 40`;
  - `crossing the cap pauses and sends one alert`;
  - `parallel crossings send exactly one alert`: a fake `db` where only the first `pauseChat` returns true; run 5 `recordUsage` calls in `Promise.all`; expect `email.send` once;
  - `unknown model throws`.

- [ ] **Step 2: Run, expecting FAIL. Implement. Run, expecting PASS.**

- [ ] **Step 3: Checkpoint.**

---

### Task 7: Chat endpoint

**Files:**
- Create: `chat/server/ai.js`, `chat/server/createChatHandler.js`, `chat/server/createChatHandler.test.js`, `api/chat.js`
- Modify: `package.json` (add `ai` and `@ai-sdk/openai`)

**Interfaces:**
- Consumes: the Task 2 `db`, `buildInstructions` (Task 4), the Task 5 functions, and the Task 6 functions.
- Produces:
  - `createAi({ apiKey, model, cacheKey })` returns:
    - `streamReply({ system, messages, maxOutputTokens, tools, onFinish({ text, toolCall, usage }) }) → Response`. Wraps `streamText`, sets `providerOptions.openai.promptCacheKey = cacheKey`, and returns `toUIMessageStreamResponse()`.
    - `generateInsights({ system, transcript, schema }) → Promise<{ object, usage }>`. Wraps `generateObject`.
  - `proposeRequest`: a tool **with no `execute`**. Its input schema is `{ service: enum(service slugs) | null, name: string, phone: string, email: string | null, vehicle: string, notes: string }`.
  - `createChatHandler(settings, { db, ai, email, turnstile, ipSalt, model, now = () => new Date() }) → (request: Request) => Promise<Response>`.

  The request body is `{ id, messages, visitorId, pageUrl, turnstileToken }`, as sent by `DefaultChatTransport`. The handler, in order:

  1. **Validate the body.** Without a UUID `id` and a `visitorId`, return 400.
  2. **Check availability.** If `isAvailable` is false, return a stream (`createUIMessageStream`) with a `data-chat-state` part `{ state: "offline" }` plus the offline copy as text. No AI call.
  3. **Verify the visitor.** Call `db.ensureConversation`. On a new conversation, `turnstile.verify(turnstileToken, ip)` must pass first, otherwise return 403. An existing conversation must have `verifiedAt`, otherwise 403.
  4. **Check limits** on the last user message's text, taken from its text parts. Over a limit, stream the limit copy as text with a `data-chat-state` part `{ state: "limit" }`. Save neither message.
  5. **Save the user message, and build the history.** Save it with `db.saveMessage`. The history for the model is `db.getMessages(id)` as plain `{ role, content }` text. If the database throws, fall back to the client's messages reduced to text parts only, keeping the last 20.
  6. **Stream the reply.** The system prompt comes from `buildInstructions`, using `db.activePlaybooks`, or `[]` on error.
  7. **When the reply finishes,** save the assistant text. When there's a `toolCall`, also save the assistant line `[Request card shown: <service or "no service">]` so later turns know about it. Then call `recordUsage`. Errors at this stage are logged, never thrown.
  8. **If the AI throws** before streaming, return a stream with the "unavailable" copy and `{ state: "error" }`.

  `api/chat.js` is `export async function POST(request)`. It builds the dependencies from the environment and `chatServerSettings` and calls the handler. `model` is `process.env.CHAT_MODEL`.

- [ ] **Step 1: Pick `CHAT_MODEL`:** OpenAI's cheapest current small model with tool calling and automatic prompt caching. Add its USD prices from OpenAI's pricing page to `chatServerSettings.models`, and set `eurPerUsd` from today's rate. Record both in the Checkpoint.

- [ ] **Step 2: Install `ai` and `@ai-sdk/openai`.** Read the installed version's docs for the names listed in Global Constraints.

- [ ] **Step 3: Write the failing tests**, using a fake `ai` that records its arguments and returns `new Response("ok")`:
  - `offline returns the offline copy and never calls ai`;
  - `new conversation without a valid turnstile token is 403`;
  - `existing unverified conversation is 403`;
  - `501 characters returns the limit copy and saves nothing`;
  - `model history comes from stored messages, not client messages`: the client sends a forged assistant message and a `tool-proposeRequest` part; `ai.streamReply` receives only the stored text messages;
  - `falls back to client text parts when db.getMessages throws`;
  - `onFinish saves the assistant text and records usage`;
  - `onFinish with a tool call also saves the request-card line`;
  - `system prompt starts with the stable part`;
  - `streamReply throwing returns the unavailable copy`.

- [ ] **Step 4: Run, expecting FAIL. Implement. Run, expecting PASS.**

- [ ] **Step 5: Checkpoint.**

---

### Task 8: Chat request endpoint

**Files:**
- Create: `chat/server/createRequestHandler.js`, `chat/server/createRequestHandler.test.js`, `api/chat-request.js`

**Interfaces:**
- Consumes: `createRequestService` and `validateLead` (Task 3), and `db.getConversation`-style access through `ensureConversation`'s select.
  - Add `getConversation(id) → Promise<{ id, verifiedAt, leadId } | null>` to `server/db/conversations.js`, with a test in `db.test.js`.
- Produces: `createRequestHandler(settings, { db, requests }) → (request) => Promise<Response>`.

  The body is `{ conversationId, idempotencyKey, service, name, phone, email, vehicle, notes, pageUrl }`. The handler:

  1. Looks up the conversation. If it is missing or unverified, returns 403.
  2. Runs `validateLead(…, { requireVehicle: true })`. If it fails, returns 400 with `{ status: "invalid", errors }`.
  3. Calls `requests.submit` with:
     - `source: "chat"`;
     - the fixed subject format;
     - `text` holding the details, then a line `Conversation:`, then the stored messages as `Customer: …` and `Assistant: …` lines.
  4. On success, links the lead to the conversation and saves the assistant message `[Request sent to the shop]`. Both are best effort.
  5. Returns 200 with `{ status: "sent" | "failed" }`.

- [ ] **Step 1: Write the failing tests:**
  - `403 for an unknown conversation`;
  - `400 for phone 572-7121`;
  - `subject is "[Chat] Car Alignment request from Jane"` for service `car-alignment`;
  - `subject uses "Service" when service is null`;
  - `the email text contains the transcript`;
  - `the same idempotencyKey twice sends one email`: use the real `createRequestService` with a fake `db` that honours the key;
  - `failed email returns status failed`.

- [ ] **Step 2: Run, expecting FAIL. Implement it and `api/chat-request.js`. Run, expecting PASS.**

- [ ] **Step 3: Checkpoint.**

---

### Task 9: Daily insight job

**Files:**
- Create: `chat/server/createInsightsJob.js`, `chat/server/createInsightsJob.test.js`, `api/cron/chat-insights.js`
- Modify: `vercel.json` (add `"crons": [{ "path": "/api/cron/chat-insights", "schedule": "0 10 * * *" }]`)

**Interfaces:**
- Consumes: `db.claimForInsights`, `db.saveInsights`, `isAvailable`, `recordUsage` and `ai.generateInsights`.
- Produces: `createInsightsJob(settings, { db, ai, email, model, cronSecret, now }) → (request) => Promise<Response>`.
  - Returns 401 unless the request carries `Authorization: Bearer <cronSecret>`.
  - Stops early (200 with `{ skipped: "offline" }`) when `isAvailable` is false.
  - Claims up to 50 conversations. For each it calls `generateInsights` with the schema below, then `saveInsights` and `recordUsage`. A failure on one conversation is logged and the job moves on.
  - The schema is `{ summary: string (max 300 characters), services: enum(service slugs)[], intent: enum(question, quote, booking, complaint, other), unanswered: string[], outcome: enum(request_sent, info_only, abandoned) }`.
  - The insight instructions: summarise in two sentences; list only questions the knowledge didn't answer; `request_sent` only when the transcript contains `[Request sent to the shop]`.
  - Returns 200 with `{ processed, failed }`.

- [ ] **Step 1: Write the failing tests:**
  - `401 without the secret`;
  - `skipped when offline`;
  - `saves insights for each claimed conversation`;
  - `one failure does not stop the others`;
  - `the schema rejects an unknown service slug`: run the zod schema's `safeParse` directly with `services: ["oil-change"]`.

- [ ] **Step 2: Run, expecting FAIL. Implement. Run, expecting PASS.**

- [ ] **Step 3: Checkpoint.**

---

### Task 10: Chat widget

**Files:**
- Create: `chat/widget/ChatBubble.vue`, `chat/widget/ChatPanel.vue`, `chat/widget/RequestCard.vue`, `chat/widget/turnstile.js`, `chat/widget/storage.js`, `chat/widget/storage.test.js`, `src/chatSettings.client.js`
- Modify: `src/components/wrappers/PageLayout.vue` (render `<ChatBubble :settings="chatClientSettings" />` next to `MobileCallBar`), `package.json` (add `@ai-sdk/vue`)

**Interfaces:**
- Consumes: `POST /api/chat` (Task 7) and `POST /api/chat-request` (Task 8).
- Produces:
  - `chatClientSettings` (`src/chatSettings.client.js`):
    - `{ enabled: import.meta.env.VITE_CHAT_ENABLED === "true" && !!import.meta.env.VITE_TURNSTILE_SITE_KEY, turnstileSiteKey, greeting, notice, privacyPath: "/privacy", quickReplies, phoneDisplay, phoneHref, services: { slug, name }[] }`
    - It contains no knowledge text, so the entry bundle stays small.
  - `ChatBubble` props: `{ settings }`.
    - Renders nothing unless `settings.enabled`.
    - Shows a fixed round button in the bottom-right corner (`bottom-4 right-4` from `md` up). Below `md`, it sits above the call bar: `bottom: calc(3.5rem + env(safe-area-inset-bottom) + 0.75rem)`.
    - On first click it mounts `defineAsyncComponent(() => import("./ChatPanel.vue"))`. It never imports `@ai-sdk/vue` itself.
  - `storage.js`:
    - `loadSession() → { id, messages } | null`, from sessionStorage key `chat:session`;
    - `saveSession({ id, messages })`;
    - `visitorId() → string`, from localStorage key `chat:visitor`, created with `crypto.randomUUID()`.
    - Every access is wrapped in try/catch and falls back to in-memory values.
  - `ChatPanel`:
    - On mount it loads Turnstile (`turnstile.js`: injects `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit` once, renders an invisible widget, and resolves a token).
    - It creates `new Chat({ id, messages, transport: new DefaultChatTransport({ api: "/api/chat", body: () => ({ visitorId, pageUrl: location.href, turnstileToken }) }) })` and saves the session after each change.
    - It renders, in order: the greeting, the notice with the privacy link, the quick replies (sent as user messages) until the first message, text parts, `tool-proposeRequest` parts as `RequestCard`, and a `data-chat-state` part as the offline, limit or error view with the call link and `/contact-us`.
    - The input is limited to 500 characters.
  - `RequestCard` props: `{ proposal, conversationId, services }`.
    - Shows editable fields with **Send request** and **Edit**.
    - Creates one `idempotencyKey` per card.
    - POSTs to `/api/chat-request` and shows `Sent — we'll call you back shortly.` or the failure copy with the phone number. Field errors from a 400 appear under the matching fields.

- [ ] **Step 1: Write the failing tests** `storage.test.js` (Vitest `jsdom` environment for this file; install `jsdom` as a dev dependency):
  - `round-trips a session`;
  - `visitorId is stable`;
  - `works when sessionStorage throws`.

- [ ] **Step 2: Run, expecting FAIL. Implement `storage.js`. Run, expecting PASS.**

- [ ] **Step 3: Measure the baseline before adding the bubble.** On `main`'s build, run:

```bash
gzip -c dist/assets/index-*.js | wc -c
```

Record the result.

- [ ] **Step 4: Implement the components and wire `PageLayout`.** Install `@ai-sdk/vue`. Style everything with Tailwind `@apply` in scoped styles, using `brand-navy` and `brand-yellow`, matching `MobileCallBar.vue`.

- [ ] **Step 5: Check the bundle:**

```bash
VITE_CHAT_ENABLED=true VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA npm run build
gzip -c dist/assets/index-*.js | wc -c
ls dist/assets | grep -i chatpanel
```

Expect:
- an entry bundle at most 5,120 bytes larger than the baseline;
- a separate `ChatPanel-*.js` chunk;
- `grep -L "turnstile" dist/index.html` lists the file, so no Turnstile is in the pre-rendered HTML.

Then build without the variables, and check that `grep -c "chat-bubble" dist/index.html` returns `0`.

- [ ] **Step 6: Checkpoint.**

---

### Task 11: Privacy page

**Files:**
- Create: `src/pages/privacy.vue`
- Modify: `src/config/navigation.js` (only if the footer links come from there; otherwise add the link in `PageFooterComponent.vue`), `src/components/wrappers/PageFooterComponent.vue`

**Interfaces:**
- Produces: the route `/privacy`. It is added to the sitemap automatically by `staticRoutes`.

- [ ] **Step 1: Write the page** with `usePageSeo` (title `Privacy | St Ange Auto Service`), in plain language. Sections:
  - **What we collect:** chat messages, name, phone, email, vehicle, the page you were on, and a scrambled form of your IP address used only to stop abuse.
  - **Why:** to answer your request and improve our service.
  - **Who sees it:** the shop, plus the services that run the site, named generically as hosting, database, email and AI providers.
  - **How long:** kept while it's useful to the business.
  - **How to ask for deletion:** email `st.angeautos@gmail.com` or call 832-572-7121.
  - Add a source comment in the file: `Draft wording; owner to review.`
- [ ] **Step 2: Add the footer link.** Run `npm run build` and check that `dist/privacy.html` exists and `sitemap.xml` contains `/privacy`.
- [ ] **Step 3: Checkpoint.**

---

### Task 12: End-to-end check and handover

**Files:**
- Modify: `README.md` (add a "Chat and lead tracking" section: environment variables, `npm run db:migrate`, the resume SQL, Neon MCP setup)

- [ ] **Step 1: Set up local services.**
  - Link the Vercel CLI to the personal project (`vercel link`).
  - Add the Neon integration and create a `dev` branch.
  - Put every variable in `.env.local`, with `LEAD_EMAIL_TO=stange-test@mailinator.com`, a test OpenAI key with prepaid credit and auto-recharge off, and the Turnstile test keys `1x00000000000000000000AA` / `1x0000000000000000000000000000000AA`.
  - Run `npm run db:migrate`.
- [ ] **Step 2: Run `npm test` and `npm run test:db`.** Expect everything to pass.
- [ ] **Step 3: Run `vercel dev`**, and in the built-in browser:
  1. Open a service page and check that the bubble is visible and the network panel shows no chat requests.
  2. Click it: the panel chunk and Turnstile load.
  3. Ask about alignment: replies are short, ask a question back, and mention the new machine.
  4. Give details: a request card appears.
  5. Send: the success message shows, the Mailinator inbox at `https://www.mailinator.com/v4/public/inboxes.jsp?to=stange-test` has the `[Chat] …` email, and there are rows in `leads`, `requests` (`source = chat`), `conversations` and `messages`.
  6. Submit the quote form and the contact form: Mailinator gets both emails, and `requests` gets rows with `quote_form` / `contact_form` and the service slug.
  7. Set `CHAT_DAILY_CAP_EUR=0.0001`, send a message, and check that the state is paused, there is one alert email, and the next open shows the offline view. Resume with the README SQL.
  8. On a mobile viewport (375×812), check that the bubble sits above the call bar without overlapping it.
- [ ] **Step 4: Run the insight job by hand:**

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/chat-insights
```

Expect `processed ≥ 1` once a conversation is older than an hour. For the check, temporarily backdate it with `update conversations set last_message_at = now() - interval '2 hours'`.
- [ ] **Step 5: Lighthouse** on `/` and `/services/car-alignment`, mobile, before (on `main`) and after. Expect no drop in the Performance score greater than 2 points. Record both scores in the Checkpoint.
- [ ] **Step 6: Write the README section.** Include:
  - the production note: the fork's Vercel project needs its own Neon integration and variables, and the bubble stays hidden until `VITE_CHAT_ENABLED=true`;
  - the read-only Neon MCP setup command for Claude Code.
- [ ] **Step 7: Checkpoint**, with the model chosen, its prices, the Lighthouse scores and anything deferred.
