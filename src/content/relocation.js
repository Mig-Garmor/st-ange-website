// Imported by llmsTxt.js at build time, so only relative imports work here.
import { business, fullAddress, shortAddress } from "../config/business.js";

export const relocationNotice = {
  lead: "We've moved to a bigger shop!",
  parts: [
    { text: "Find us at our new location, " },
    { text: shortAddress, key: true },
    { text: "." },
  ],
};

export const addressNote = "New location.";

export const relocationFaq = {
  question: `Did ${business.name} move?`,
  answer: `Yes. We've moved to a much bigger shop. You'll find us at our new location, ${fullAddress}.`,
};

export const relocationLlmsLine = `- New location: the shop recently moved to a bigger space at ${fullAddress}`;
