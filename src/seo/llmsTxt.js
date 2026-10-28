// Imported by vite.config.js at build time, so only relative imports work here.
import { business, fullAddress, hoursSummary, services } from "../config/business.js";
import { relocationLlmsLine } from "../content/relocation.js";
import { allReviews, googleReviews, serviceName } from "../content/reviews.js";

const url = (path) => new URL(path, business.siteUrl).href;

const reviewLine = (review) => {
  const about = review.services.length ? `, about ${review.services.map(serviceName).join(", ")}` : "";
  const text = review.text.replace(/\s*\n+\s*/g, " ");
  return `- "${text}" — ${review.author}, ${review.rating}/5, posted ${review.postedAgo} as of ${googleReviews.capturedAt}${about}. Original: ${review.url}`;
};

export function buildLlmsTxt() {
  return `# ${business.name}

> Family-owned auto repair shop and mechanic at ${fullAddress}. Car alignment, A/C repair, brake repair, suspension and steering, and new and used tires. Call ${business.phone.display}.

${business.name} is a family-owned St. Lucian mechanic shop on ${business.address.area} in Baytown, Texas. The owner has more than ${business.yearsExperience.replace("+", "")} years of experience, starting at his uncle's tire shop and later running a mobile mechanic business. The shop shows customers the problem and gives a clear price before any work starts.

- Address: ${fullAddress}
${relocationLlmsLine}
- Phone: ${business.phone.display} (${business.phone.schema})
- Email: ${business.email}
- Hours: ${hoursSummary}
- Google rating: ${googleReviews.rating.toFixed(1)} out of 5 from ${googleReviews.count} reviews (as of ${googleReviews.capturedAt})
- Directions: ${business.links.maps}
- Google reviews: ${googleReviews.url}

## Google reviews

Every review below is copied verbatim from the shop's Google Business Profile on ${googleReviews.capturedAt}, and each "Original" link opens that exact review on Google Maps. The ${googleReviews.count - allReviews.length} reviews that have a star rating but no written text are not listed.

${allReviews.map(reviewLine).join("\n")}

## Services

${services.map((service) => `- [${service.name}](${url(`/services/${service.slug}`)}): ${service.summary}`).join("\n")}

## Pages

- [Home](${url("/")}): overview, customer reviews, hours, map and FAQs
- [All services](${url("/services")}): every service with a short description
- [About](${url("/about")}): the family story behind the shop
- [Contact](${url("/contact-us")}): contact form, phone, address and map
`;
}
