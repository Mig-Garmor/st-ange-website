import { business, services } from "@/config/business";

const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? "";

export const chatClientSettings = {
  enabled: import.meta.env.VITE_CHAT_ENABLED === "true" && !!siteKey,
  turnstileSiteKey: siteKey,
  greeting: "Hi! How can we help with your car today?",
  notice: "We save this chat to help with your request.",
  privacyPath: "/privacy",
  quickReplies: ["Wheel alignment", "Brake repair", "Get a quote", "Hours & location"],
  phoneDisplay: business.phone.display,
  phoneHref: business.phone.href,
  services: services.map(({ slug, name }) => ({ slug, name })),
};
