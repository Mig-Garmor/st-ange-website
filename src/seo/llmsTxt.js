// Imported by vite.config.js at build time, so only relative imports work here.
import { business, fullAddress, hoursSummary, services } from "../config/business.js";
import { relocationLlmsLine } from "../content/relocation.js";

const url = (path) => new URL(path, business.siteUrl).href;

export function buildLlmsTxt() {
  return `# ${business.name}

> Family-owned auto repair shop and mechanic at ${fullAddress}. Car alignment, A/C repair, brake repair, suspension and steering, and new and used tires. Call ${business.phone.display}.

${business.name} is a family-owned St. Lucian mechanic shop on ${business.address.area} in Baytown, Texas. The owner has more than ${business.yearsExperience.replace("+", "")} years of experience, starting at his uncle's tire shop and later running a mobile mechanic business. The shop shows customers the problem and gives a clear price before any work starts.

- Address: ${fullAddress}
${relocationLlmsLine}
- Phone: ${business.phone.display} (${business.phone.schema})
- Email: ${business.email}
- Hours: ${hoursSummary}
- Google rating: ${business.googleRating} out of 5
- Directions: ${business.links.maps}
- Google reviews: ${business.links.reviews}

## Services

${services.map((service) => `- [${service.name}](${url(`/services/${service.slug}`)}): ${service.summary}`).join("\n")}

## Pages

- [Home](${url("/")}): overview, customer reviews, hours, map and FAQs
- [All services](${url("/services")}): every service with a short description
- [About](${url("/about")}): the family story behind the shop
- [Contact](${url("/contact-us")}): contact form, phone, address and map
`;
}
