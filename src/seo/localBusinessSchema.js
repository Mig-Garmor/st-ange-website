// Imported by the build-time structured data check in Node, so only relative imports work here.
import { business, serviceZips, services } from "../config/business.js";

export const businessId = `${business.siteUrl}/#business`;
export const websiteId = `${business.siteUrl}/#website`;
export const serviceId = (slug) => `${business.siteUrl}/services/${slug}#service`;

export function websiteNode() {
  return {
    "@type": "WebSite",
    "@id": websiteId,
    name: business.name,
    alternateName: "St. Ange Auto Service",
    url: `${business.siteUrl}/`,
    inLanguage: "en-US",
    publisher: { "@id": businessId },
  };
}

// No aggregateRating or reviews: Google's rules forbid a business marking up its own reviews,
// or ratings copied from another site, and a breach can switch off every rich result on the site.
export function businessNode() {
  const { address, geo, phone, links } = business;

  return {
    "@type": "AutoRepair",
    "@id": businessId,
    name: business.name,
    url: `${business.siteUrl}/`,
    image: `${business.siteUrl}${business.defaultImage}`,
    logo: `${business.siteUrl}/android-chrome-512x512.png`,
    telephone: phone.schema,
    email: business.email,
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      streetAddress: address.street,
      addressLocality: address.city,
      addressRegion: address.region,
      postalCode: address.postalCode,
      addressCountry: address.country,
    },
    geo: { "@type": "GeoCoordinates", latitude: geo.latitude, longitude: geo.longitude },
    hasMap: links.maps,
    areaServed: [
      { "@type": "City", name: "Baytown, TX" },
      ...serviceZips.map((postalCode) => ({
        "@type": "Place",
        address: { "@type": "PostalAddress", addressLocality: "Baytown", addressRegion: "TX", postalCode },
      })),
    ],
    openingHoursSpecification: business.hours
      .filter((slot) => slot.days.length)
      .map((slot) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: slot.days,
        opens: slot.opens,
        closes: slot.closes,
      })),
    contactPoint: {
      "@type": "ContactPoint",
      telephone: phone.schema,
      contactType: "customer service",
      areaServed: "US",
      availableLanguage: "English",
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Auto repair services",
      itemListElement: services.map((service) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          "@id": serviceId(service.slug),
          name: service.name,
          url: `${business.siteUrl}/services/${service.slug}`,
        },
      })),
    },
    sameAs: [links.googleProfile, links.facebook],
    description:
      "Family-owned auto repair and mechanic shop offering wheel alignment, A/C repair, brake repair, suspension, and tire services in Baytown, Texas.",
  };
}
