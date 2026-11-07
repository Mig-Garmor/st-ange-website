// Imported by the description length test in Node, so only relative imports work here.
import { googleReviews } from "./reviews.js";

export const pageDescriptions = {
  home: "Family-owned auto repair shop and mechanic: brakes, A/C, alignments and tires.",
  services: "Car repair: alignments, A/C, brakes, suspension, steering and new tires.",
  about: "Family-owned mechanic and auto repair shop with over 30 years of experience.",
  contact: "Call or message us about brakes, A/C, alignment or any car repair.",
  reviews: `Rated ${googleReviews.rating.toFixed(1)} out of 5 from ${googleReviews.count} Google reviews, each word for word.`,
  privacy: "What we collect when you contact us or use our chat, and how to delete it.",
};
