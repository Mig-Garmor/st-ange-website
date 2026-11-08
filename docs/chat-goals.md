# Chat goals

Why the chat exists, what is built, and the decisions still open. Read this before planning chat or Website Hub work, and update it when a decision is made.

## Goals (set by the owner, 2026-11-08)

1. **Answer visitors without a phone call.** The chat covers the site's FAQs and knowledge and what the business does, so visitors get answers without calling.
2. **Learn who the customers are.** Every conversation and request is captured. AI in the Website Hub summarises them to show:
   - which services visitors need most;
   - customer profiles: who comes to the site and what they are looking for.
3. **Keep every lead in the Website Hub.** Each request (chat card, quote form, contact form) is stored there as a lead.

## What exists today

- **Chat (this repo, `chat/`):**
  - Built, but switched off in production: the bubble shows only when `VITE_CHAT_ENABLED=true` and the Turnstile site key are set at build time.
  - Go-live steps: README → "Chat and lead tracking" → "Before going live".
  - Brevo email is fixed as of 2026-11-08.
  - The model comes from `CHAT_MODEL`. Its prices and provider routing are in `server/chatSettings.js` → `models`.
  - Every call runs with zero data retention (ZDR, through OpenRouter).
  - Replies are capped at 150 tokens, with a daily spend cap (`CHAT_DAILY_CAP_EUR`, default €5).
- **Per-chat insights (this repo, `chat/server/createInsightsJob.js`):**
  - A daily cron (`/api/cron/chat-insights`, 10:00 UTC) reads each finished chat once, with the same `CHAT_MODEL`.
  - It stores a 2-sentence summary, the services asked about, the intent (question, quote, booking, complaint, other), the questions the site couldn't answer, and the outcome.
  - Then it forwards the chat and its insights to the hub. Each chat is analysed only once, so this step never grows with history.
- **Website Hub (`~/personal/website-multitenant-hub`):**
  - Receives requests (`/api/v1/requests`) and analysed chats (`/api/v1/conversations`).
  - Already has Chats, Contacts and Reports pages per tenant.
  - It has no cross-chat analysis yet.

## Open decisions (to plan and discuss)

### 1. How the cross-chat analysis runs

Goal 2 needs a step that reads many chats together and finds patterns: top services, recurring questions, customer profiles. It should run from an **Analyse** button in the hub, from a weekly cron, or both. It must not get heavier every week as chats pile up.

Options:

- **A. Re-read everything each run.** Best detail, but the cost and the prompt size grow without limit. Eventually the input no longer fits the model.
- **B. Rolling summary.** Each run reads only the chats since the last run, plus the previous run's report. This is cheap and flat. But errors and bias carry forward, and early detail fades.
- **C. Two layers (proposal).**
  - Each run reads only the new period's per-chat records: the short summaries and structured fields already stored, not the raw transcripts. Those records are small, so a week or a month of chats fits easily.
  - The run writes a period report that is kept.
  - Trend views ("top services this quarter") come from counting the stored structured fields with SQL, not from AI.
  - A deeper re-analysis of a chosen date range stays possible on demand (the button), and is capped to a maximum number of chats.

Still to settle:
- the period (weekly or monthly) at about today's chat volume;
- whether a run should also see the previous report;
- what a "customer profile" contains;
- how much visitor-written text a report may quote. Reports feed people, never the bot's instructions, unless a person reviews them first. The backlog's playbook item has the same rule.

### 2. Which model for the chat

What it needs:
- good answers and reliable tool calls (the request card);
- ZDR available;
- cheap, at about €0.001 per message with prompt caching.

Candidates already priced in `chatSettings.js`:
- `openai/gpt-6-luna` (the `.env.example` default);
- `anthropic/claude-haiku-5.5` on Bedrock, which was measured caching under ZDR;
- `qwen/qwen3.6-35b-a3b` and `qwen/qwen3.7-flash`, the cheapest.

To decide: run the same scripted test chats through each, then pick on quality and on how often the request card fails. Re-check prices and ZDR providers on OpenRouter on the day.

### 3. Which model for the analysis

The analysis runs rarely, so a more capable model is affordable. It needs:
- ZDR, because the chats contain visitor names and phone numbers;
- structured output;
- a context window large enough for one period's records.

To decide: which model, and whether the per-chat step keeps using `CHAT_MODEL` or moves to a separate setting such as `INSIGHTS_MODEL`.

### 4. Where it lives in the hub

- Probably on the tenant's Reports page:
  - an **Analyse** button with a date range;
  - a list of past reports;
  - the latest report on top: top services, recurring questions, customer profiles, and unanswered questions that would make good FAQs.
- The weekly cron runs in the hub, not in each site, so every tenant gets it.
- The analysis code, its model key and its spend cap belong in the hub. Sites only send data.

### 5. Leads in the hub (goal 3)

- Requests are already forwarded since PR #43.
- To finish:
  - confirm that a live chat request and a live form request both appear in the hub;
  - decide whether the hub or this site's Neon database is the main store for leads.
