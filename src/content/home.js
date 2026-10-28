import { business, fullAddress } from "@/config/business";
import { relocationFaq } from "@/content/relocation";
import { reviewSource } from "@/content/reviews";

export const reasons = [
  {
    icon: "mdi:magnify-scan",
    title: "We show you the problem",
    text: "Before any work starts, we walk you through what's wrong with your car, so you can see it for yourself.",
  },
  {
    icon: "mdi:cash-check",
    title: "Fair, upfront pricing",
    text: "You get a clear price before we pick up a wrench. No surprise charges when you come to collect your car.",
  },
  {
    icon: "mdi:account-group",
    title: `Family-owned, ${business.yearsExperience} years`,
    text: "Our owner learned the trade at his uncle's tire shop and ran a mobile mechanic business before opening our Baytown shop.",
  },
  {
    icon: "mdi:timer-check-outline",
    title: "Back on the road quickly",
    text: "We order parts fast and keep you updated, so you're not without your car any longer than you need to be.",
  },
];

export const faqs = [
  relocationFaq,
  {
    question: "Where is St Ange Auto Service located?",
    answer: `We're at ${fullAddress}, on ${business.address.area} in Baytown. Use the map on this page for directions.`,
  },
  {
    id: "hours",
    question: "What are your opening hours?",
    answer: "Give us a call before you come in so we can make sure a bay is free.",
  },
  {
    question: "What car repairs do you handle?",
    answer:
      "We do wheel alignments, A/C repair, brake repair, suspension and steering work, and sell new and used tires. If you're not sure what's wrong, call us and describe the problem.",
  },
  {
    question: "Will you show me the problem and the price before you start?",
    answer:
      "Yes. We diagnose the problem, show you what's wrong, explain it in plain language and give you the price before any work begins. Customers mention this often in their reviews.",
    sources: [
      reviewSource("papillion", "shown the problem with their Toyota pickup before the repair"),
      reviewSource("martin", "clear explanation of the repairs with no hidden fees"),
      reviewSource("joseph", "transparency about the problem and the price"),
    ],
  },
  {
    question: "Is St Ange Auto Service cheaper than the dealer?",
    answer:
      "We can't quote a price before we've seen your car, but customers have shared their results: one paid about a third of the dealer's quote for a transmission repair, another saved about $1,000 on an A/C repair, and another's final bill came in under the quoted price.",
    sources: [
      reviewSource("martin", "transmission repair for about a third of the dealer's quote"),
      reviewSource("matthew", "about $1,000 saved on an A/C repair"),
      reviewSource("jeff", "final bill came in under the quote"),
    ],
  },
  {
    question: "How quickly can you fix my car?",
    answer:
      "It depends on the job and whether parts need ordering. We order parts quickly and keep you updated. One customer's A/C was fixed in under 24 hours, parts included, and others say the work was finished faster than they expected.",
    sources: [
      reviewSource("matthew", "A/C fixed in under 24 hours, parts included"),
      reviewSource("martin", "repair finished faster than expected"),
      reviewSource("caribbean-affairs", "service faster than expected"),
    ],
  },
  {
    question: "Do you sell used tires?",
    answer:
      "Yes. We carry both new and quality used tires, so you can choose the option that fits your budget.",
  },
];
