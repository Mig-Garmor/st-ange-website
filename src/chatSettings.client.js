import { business, hoursAndLocation, services } from "@/config/business";

const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? "";

export const chatClientSettings = {
  enabled: import.meta.env.VITE_CHAT_ENABLED === "true" && !!siteKey,
  turnstileSiteKey: siteKey,
  greeting: "Hi! How can we help with your car today?",
  notice: "Automated assistant. Prices and promises only count once the shop confirms them. We save this chat to help with your request.",
  privacyPath: "/privacy",
  placeholders: ["Type your message", "What can we help you with?", "Tell us what your car is doing", "Ask about alignment or brakes"],
  quickReplies: ["Wheel alignment", "Brake repair", "Get a quote", "Hours & location"],
  localAnswers: { "Hours & location": hoursAndLocation },
  phoneDisplay: business.phone.display,
  phoneHref: business.phone.href,
  localAreaCodes: business.localAreaCodes,
  services: services.map(({ slug, name }) => ({ slug, name })),
};
