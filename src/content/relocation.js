// Imported by llmsTxt.js at build time, so only relative imports work here.
import { business, hasMoved, relocation } from "../config/business.js";

const { previous, next, moveDay, moveDate, distance } = relocation;
const { city, region, postalCode } = business.address;
const nextFullAddress = `${next.street}, ${city}, ${region} ${postalCode}`;
const nextShortAddress = `${next.street}, ${city}`;

export const relocationNotice = hasMoved
  ? {
      lead: "We've moved to a bigger shop!",
      parts: [
        { text: "We're now at " },
        { text: nextShortAddress, key: true },
        { text: `. We moved due to high customer demand and no longer work from ${previous.street}.` },
      ],
    }
  : {
      lead: "We're moving to a bigger shop!",
      parts: [
        { text: "From " },
        { text: moveDay, key: true },
        { text: " we'll be at " },
        { text: nextShortAddress, key: true },
        { text: ", due to high customer demand." },
      ],
    };

export const addressNote = hasMoved
  ? `Formerly at ${previous.street}.`
  : `Moving to ${next.street} on ${moveDay}.`;

export const relocationFaq = hasMoved
  ? {
      question: `Did ${business.name} move?`,
      answer: `Yes. Since ${moveDate} we've been at ${nextFullAddress}, ${distance} from our old shop at ${previous.street}. We moved to a much bigger shop due to high customer demand and no longer work from ${previous.street}.`,
    }
  : {
      question: `Is ${business.name} moving?`,
      answer: `Yes. From ${moveDay} we'll be at ${nextFullAddress}, ${distance} from our current shop. We're moving to a much bigger shop due to high customer demand. Until then, you'll find us at ${previous.street}.`,
    };

export const relocationLlmsLine = hasMoved
  ? `- Previous address: ${previous.street} (moved to a bigger shop at ${next.street} on ${moveDate})`
  : `- Moving: from ${moveDate} the shop will be at ${nextFullAddress}, a much bigger shop`;
