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

const hoursText = business.hours.map((slot) => `${slot.label}: ${slot.display}`).join("; ");

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
  knowledge,
  featured,
  services: services.map(({ slug, name }) => ({ slug, name })),
  limits: { maxChars: 500, maxUserMessages: 20, perHour: 40 },
  maxOutputTokens: 150,
  dailyCapEur: Number(process.env.CHAT_DAILY_CAP_EUR ?? 5),
  models: {},
  eurPerUsd: null,
  hours: business.hours,
};
