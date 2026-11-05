import { localFlag, localOverride } from "./localOverride.js";
import { business, fullAddress, serviceZipsText, services } from "../src/config/business.js";
import { faqs } from "../src/content/home.js";
import { relocationFaq } from "../src/content/relocation.js";
import { googleReviews } from "../src/content/reviews.js";
import { servicePages } from "../src/content/services.js";

const bullets = (items = []) => items.map((item) => `- ${item}`).join("\n");
const qa = (list) => list.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n");

const servicePageKnowledge = (page) =>
  [
    `### ${page.name}`,
    page.summary,
    (page.intro ?? []).join("\n"),
    page.feature && `${page.feature.title}\n${[...(page.feature.paragraphs ?? []), ...(page.feature.items ?? [])].join("\n")}`,
    page.signs?.length && `${page.signsTitle ?? "Signs you need it"}:\n${bullets(page.signs)}`,
    page.process?.length && `${page.processTitle ?? "What it includes"}:\n${bullets(page.process)}`,
    page.faqs?.length && qa(page.faqs),
  ]
    .filter(Boolean)
    .join("\n");

const hoursText = business.hours
  .map((slot) => `${slot.label}: ${slot.display}`.replace(/\s*[–—]\s*/g, " to "))
  .join("; ");

const knowledge = `## Business knowledge

${business.name} is a family-owned auto repair shop. Owner experience: ${business.yearsExperience} years.
Address: ${fullAddress}. ${relocationFaq.answer}
Phone: ${business.phone.display}
Hours: ${hoursText}
ZIP codes served: ${serviceZipsText}
Google rating: ${googleReviews.rating.toFixed(1)} out of 5 from ${googleReviews.count} reviews

## Services

${servicePages.map(servicePageKnowledge).join("\n\n")}

## General questions

${qa(faqs)}`;

const featured = `The shop has a new alignment machine and offers brake services. Mention them when the person talks about new tires, suspension work, the car pulling to one side, a crooked steering wheel, a squealing or grinding noise when braking, or a soft brake pedal. Do not mention them otherwise.`;

export const chatServerSettings = {
  site: "st-ange",
  timeZone: "America/Chicago",
  phoneDisplay: business.phone.display,
  localAreaCodes: business.localAreaCodes,
  callbackConsent: business.callbackConsent,
  retention: business.retention,
  knowledge,
  featured,
  services: services.map(({ slug, name }) => ({ slug, name })),
  // maxChars covers a burst of quick messages sent as one turn; MAX_TURN_CHARS in chat/widget/messages.js matches it.
  // perHour is per IP across chats; CHAT_LIMIT_PER_HOUR (0 = off) only overrides it in local development.
  limits: { maxChars: 1000, maxUserMessages: 20, maxAttempts: 30, perHour: localOverride("CHAT_LIMIT_PER_HOUR", 40) },
  // Zero data retention on every AI call; CHAT_ZDR=false only works locally, to test models with no ZDR provider.
  zdr: localFlag("CHAT_ZDR", true),
  // Must match the quick reply text in src/chatSettings.client.js.
  formTriggers: ["Get a quote"],
  maxOutputTokens: 150,
  dailyCapEur: Number(process.env.CHAT_DAILY_CAP_EUR ?? 5),
  // OpenRouter reports each call's real cost, so this table is only a fallback for calls that report none.
  providerReportsCost: true,
  // For openai/, anthropic/ and nvidia/ models, unless an entry sets its own reasoningEffort; keeps the 150-token budget for text.
  defaultReasoningEffort: "none",
  // OpenRouter USD per 1M tokens, read 2026-11-04 from openrouter.ai/api/v1/models.
  models: {
    "openai/gpt-6-luna": { inputUsd: 0.1, cachedInputUsd: 0.01, cacheWriteUsd: 0.125, outputUsd: 0.5 },
    // Bedrock: measured 5,498 of 5,506 prompt tokens read from cache under ZDR (2026-11-05); spreading across providers read none.
    "anthropic/claude-haiku-5.5": { inputUsd: 0.1, cachedInputUsd: 0.01, cacheWriteUsd: 0.125, outputUsd: 0.5, providerOrder: ["amazon-bedrock"] },
    // Reasons by default; off so the 150-token budget goes to the reply. Prices for prompts under 32k tokens.
    // Zero-retention test model. PrimeIntellect does not cache but cost $0.00006 a call against Parasail's $0.00017 cached (2026-11-05).
    // Fallback price only, set to the dearer providers in case the preferred one is down.
    "qwen/qwen3.6-35b-a3b": { inputUsd: 0.1, cachedInputUsd: 0.1, outputUsd: 0.95, reasoningEffort: "none", providerOrder: ["primeintellect"] },
    "qwen/qwen3.7-flash": {
      inputUsd: 0.03,
      cachedInputUsd: 0.006,
      cacheWriteUsd: 0.038,
      outputUsd: 0.13,
      reasoningEffort: "none",
    },
  },
  // ECB reference rate for 2026-11-04: 1 EUR = 1.1267 USD.
  eurPerUsd: 0.8875,
  copy: {
    offline: `Our chat is taking a break right now. Call us at ${business.phone.display}, or send a request and we'll call you back.`,
    limit: `Let's pick this up by phone: call us at ${business.phone.display}.`,
    limitConversation: `This chat has gotten long. Start a new chat to keep going, or call us at ${business.phone.display}.`,
    limitHourly: `You've sent a lot of messages in a short time. Please try again in a little while, call us at ${business.phone.display}, or send a request and we'll call you back.`,
    tooLong: "That message is a bit long for the chat. Could you shorten it?",
    unavailable: `Chat is unavailable right now. Call us at ${business.phone.display}.`,
  },
  hours: business.hours,
};
