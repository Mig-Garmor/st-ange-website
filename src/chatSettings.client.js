import { business, hoursAndLocation, services } from "@/config/business";

const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? "";

export const chatClientSettings = {
  enabled: import.meta.env.VITE_CHAT_ENABLED === "true" && !!siteKey,
  turnstileSiteKey: siteKey,
  greeting: "Hi! How can we help with your car today?",
  notice: "Automated AI assistant. We save this chat and use it to answer you and follow up on your request. Prices and promises only count once the shop confirms them.",
  privacyPath: "/privacy",
  quickReplies: ["Wheel alignment", "Brake repair", "Get a quote", "Hours & location"],
  localAnswers: { "Hours & location": hoursAndLocation },
  phoneDisplay: business.phone.display,
  phoneHref: business.phone.href,
  localAreaCodes: business.localAreaCodes,
  callbackConsent: business.callbackConsent,
  services: services.map(({ slug, name }) => ({ slug, name })),
};
