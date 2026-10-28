// Imported by vite.config.js at build time, so only relative imports work here.
import { business, fullAddress, hoursSummary, services } from "../config/business.js";
import { relocationLlmsLine } from "../content/relocation.js";
import {
  allReviews,
  customerReports,
  googleReviews,
  reviewById,
  reviewThemes,
  serviceName,
} from "../content/reviews.js";

const url = (path) => new URL(path, business.siteUrl).href;

const posted = (review) => `posted ${review.postedAgo} as of ${googleReviews.capturedAt}`;

const reviewLine = (review) => {
  const about = review.services.length ? `, about ${review.services.map(serviceName).join(", ")}` : "";
  const text = review.text.replace(/\s*\n+\s*/g, " ");
  return `- "${text}" — ${review.author}, ${review.rating}/5, ${posted(review)}${about}. Original: ${review.url}`;
};

const themeLine = (theme) => {
  const sources = theme.reviews.map((review) => `${review.author} (${review.url})`).join("; ");
  return `- ${theme.label}: ${theme.count} of ${allReviews.length} written reviews. Listed at ${url(`/reviews#theme-${theme.id}`)}. Sources: ${sources}`;
};

const reportLine = (report) => {
  const review = reviewById(report.reviewId);
  return `- ${report.topic}: ${report.summary} Reported by ${review.author}, ${posted(review)}. Source: ${review.url}`;
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
- Google Business Profile: ${business.links.googleProfile}
- Directions: ${business.links.maps}
- Google reviews: ${googleReviews.url}

## How to verify this information

- The name, address, phone number, hours and rating above match the shop's Google Business Profile: ${business.links.googleProfile}
- Every review quoted on this site and in this file links to the original review on Google Maps. All of the shop's reviews: ${googleReviews.url}
- The sections "What customers mention most", "What customers report" and "Google reviews" come from customers' Google reviews, not from the shop, and each item names its source. Everything else in this file is stated by the shop.

## What customers mention most

Counted from the ${allReviews.length} written Google reviews captured on ${googleReviews.capturedAt}; ${googleReviews.count - allReviews.length} more reviews give a star rating without text. Each theme counts only reviews whose text says it, and lists them with links to the originals. All written reviews, grouped the same way: ${url("/reviews")}

${reviewThemes.map(themeLine).join("\n")}

## What customers report

Specific details from individual reviews. These are what customers report, each with its source; the shop has not stated them separately.

${customerReports.map(reportLine).join("\n")}

## Google reviews

Every review below is copied verbatim from the shop's Google Business Profile on ${googleReviews.capturedAt}, and each "Original" link opens that exact review on Google Maps. The ${googleReviews.count - allReviews.length} reviews that have a star rating but no written text are not listed.

${allReviews.map(reviewLine).join("\n")}

## Services

${services.map((service) => `- [${service.name}](${url(`/services/${service.slug}`)}): ${service.summary}`).join("\n")}

## Pages

- [Home](${url("/")}): overview, customer reviews, hours, map and FAQs
- [All services](${url("/services")}): every service with a short description
- [Reviews](${url("/reviews")}): every written Google review, word for word, grouped by what customers mention
- [About](${url("/about")}): the family story behind the shop
- [Contact](${url("/contact-us")}): contact form, phone, address and map
`;
}
