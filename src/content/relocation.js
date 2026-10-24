// Imported by llmsTxt.js at build time, so only relative imports work here.
import { business, hasMoved, relocation } from "../config/business.js";

const { previous, next, moveDay, moveDate, distance } = relocation;
const { city, region, postalCode } = business.address;
const nextFullAddress = `${next.street}, ${city}, ${region} ${postalCode}`;

export const relocationNotice = hasMoved
  ? {
      tag: "We've moved",
      lead: "We've moved to a bigger shop!",
      text: `Due to high customer demand, we're now at ${next.street}, ${city}, and no longer work from ${previous.street}.`,
    }
  : {
      tag: "Moving soon",
      lead: "We're moving to a bigger shop!",
      text: `Due to high customer demand, from ${moveDay} we'll be at ${next.street}, ${city}.`,
    };

export const addressNote = hasMoved
  ? `Formerly at ${previous.street}.`
  : `Moving to ${next.street} on ${moveDay}.`;

export const relocationFaq = hasMoved
  ? {
      question: `Did ${business.name} move?`,
      answer: `Yes. Due to high customer demand, we moved to a much bigger shop. Since ${moveDate} we've been at ${nextFullAddress}, ${distance} from our old shop at ${previous.street}. We no longer work from ${previous.street}.`,
    }
  : {
      question: `Is ${business.name} moving?`,
      answer: `Yes. Due to high customer demand, we're moving to a much bigger shop. From ${moveDay} we'll be at ${nextFullAddress}, ${distance} from our current shop. Until then, you'll find us at ${previous.street}.`,
    };

export const relocationLlmsLine = hasMoved
  ? `- Previous address: ${previous.street} (moved to a bigger shop at ${next.street} on ${moveDate})`
  : `- Moving: from ${moveDate} the shop will be at ${nextFullAddress}, a much bigger shop`;
