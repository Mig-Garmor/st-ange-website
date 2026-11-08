# Chat goals

Why the chat exists, what is built, and the decisions still open. Read this before planning chat or Website Hub work, and update it when a decision is made.

## The business goal and the priority

- **Business goal:** more customers for **wheel alignments** and **brake jobs**, the two services the shop cares about most. Every chat and website decision is judged against that.
- **Priority:** the chat analysis ("intel harvesting", goals 2 and 4–7 and the section "What the chat analysis must produce") is **high priority**. It is how we learn what to change in the chat and the site to win those jobs.
- So the analysis reports alignment and brake chats on their own first: how many there are, how many converted, what stopped the rest, and which questions went unanswered.

## Goals (set by the owner, 2026-11-08)

1. **Answer visitors without a phone call.** The chat covers the site's FAQs and knowledge and what the business does, so visitors get answers without calling.
2. **Learn who the customers are.** Every conversation and request is captured. AI in the Website Hub summarises them to show:
   - which services visitors need most;
   - customer profiles: who comes to the site and what they are looking for.
3. **Keep every lead in the Website Hub.** Each request (chat card, quote form, contact form) is stored there as a lead, building a list of leads.
4. **Find the holes in our FAQs.** Spot the questions the chat could not answer well for the visitor, so they can become FAQs on the site.
   - The per-chat `unanswered` field is the start, but it only catches questions the knowledge did not cover.
   - Also catch answers that were technically given but did not help, for example the visitor asked again, rephrased, or left right after.
5. **Learn from chats that worked.** Record the flows where the visitor ended up leaving their details to be contacted: what they asked, what the bot said, and where they agreed. These are the input for the playbooks in `BACKLOG.md`, which a person reviews before use.
6. **Spot partner and collaboration leads.** A visitor may say something about themselves, for example that they own a business and want to work with the shop.
   - That is valuable and should be recorded.
   - The chat should ask which business they are with.
   - **Caution:** this opens new ways to manipulate the chat. Treat whatever the visitor claims about themselves as unverified, never as a reason to change what the bot may say or do. Record it as a note for a person, without promises or special treatment.
   - Check this against today's rule that the chat only uses the visitor's own details, never someone else's (`chat/server/prompt.js`, checklist item 4). A business name the visitor gives about themselves fits that rule; anyone else's details still do not.

7. **Catch manipulation in real chats.** The analysis flags chats where a visitor tried to manipulate the bot, and above all those where it worked: the bot broke a rule, promised something, revealed its instructions, or accepted a false claim.
   - Each confirmed case is reviewed by a person, fixed in the prompt or code, and added to the stress test set below so it cannot come back.
   - A flagged chat is evidence for a person, never input for playbooks or the bot's instructions.

## What the chat analysis must produce

For each chat, and rolled up across chats in the hub:

1. **Summary and intent.** What the visitor wanted, in short: question, quote, booking, complaint, partnership or other, and which services.
2. **Content gaps.** Information the visitor needed that the site does not cover or covers badly, with a suggestion of where it belongs:
   - a new FAQ on an existing page;
   - added detail on an existing page;
   - a new information page.

   Adding it to the site also lets the chat answer it, since the chat's knowledge is built from the pages (goal 4).
3. **Successful flows**, of two kinds:
   - **Answered:** the visitor got what they came for and was satisfied.
   - **Converted:** the visitor left their details and asked for a request or quote (goals 3 and 5).
4. **Manipulation.** Chats where the bot was manipulated, and chats where it could have been: an attempt that failed, or a near miss where the bot wavered. Each gets a short note of what was tried and what the bot did, for a person to review (goal 7).

**Suggested additions (proposed by Claude, not yet confirmed by the owner):**

5. **Wrong answers.** Replies that contradict the site or invent facts, such as a price, an hour, a service the shop does not offer, or a promise. This is the most damaging failure, and it is different from a gap: the bot answered, but wrongly.
6. **Where visitors drop off.** The last bot message before an unconverted visitor left: a price question it could not answer, a request for a phone number, a confusing reply. This shows which replies cost leads.
7. **Car and urgency.** The make, model and year when given, and how soon they need it ("today", "this week", "just asking"). This shows which cars and jobs the site attracts, and how urgent they are.
8. **Where and when the chat started.** The starting page (already stored as the page path), and the day and hour. This shows which pages raise questions, and whether chats come in when the shop is closed.
9. **Language.** Whether the visitor wrote in Spanish or another language. Baytown has many Spanish speakers, so this decides whether a Spanish page or chat is worth it.
10. **Price sensitivity and competitors.** Questions about cost and discounts, and mentions of other shops or of a quote from elsewhere.

All of these are counted per period in the hub report. None of them may copy a visitor's name, phone or email into a report.

The per-chat job today covers part of 1 (summary, intent, services), part of 2 (`unanswered`), and the "converted" part of 3 (`outcome: request_sent`). Still missing: partnership intent, where each gap belongs, the "answered" signal, and anything for 4.

## Before going live: stress test

The chat must be stress-tested for malicious prompts and other manipulation before it is switched on. Cover at least:
- prompt injection and jailbreaks: "ignore your instructions", role-play, fake system or admin messages, instructions hidden in pasted text;
- getting the bot to promise prices, discounts, dates or services the shop does not offer, or to speak for the owner;
- extracting the system prompt, the knowledge, or other visitors' data;
- abusing the request card: someone else's details, fake or junk leads, repeated submissions;
- false claims about the visitor's identity (owner, partner, staff) to change the bot's behaviour (goal 6);
- off-topic use, abuse and harmful content;
- cost attacks: long messages, many chats, loops near the limits and the daily cap;
- text that later reaches the hub analysis and could steer its reports.

Keep the attacks as a repeatable test set, run it against each candidate model (decision 2), and re-run it whenever the prompt or model changes.

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
