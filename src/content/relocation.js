// Imported by llmsTxt.js at build time, so only relative imports work here.
import { business, fullAddress, previousLocation, shortAddress } from "../config/business.js";

export const relocationNotice = {
  lead: "We've moved to a bigger shop!",
  parts: [
    { text: "Find us at our new location, " },
    { text: shortAddress, key: true },
    { text: `. We no longer work from ${previousLocation.street}.` },
  ],
};

export const addressNote = `New location. Formerly at ${previousLocation.street}.`;

export const relocationFaq = {
  question: `Did ${business.name} move?`,
  answer: `Yes. We've moved to a much bigger shop at ${fullAddress}, ${previousLocation.distance} from our old shop. We no longer work from ${previousLocation.street}.`,
};

export const relocationLlmsLine = `- Previous address: ${previousLocation.street} (moved to a bigger shop at ${business.address.street})`;
