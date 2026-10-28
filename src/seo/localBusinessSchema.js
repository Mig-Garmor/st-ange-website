import { business } from "@/config/business";
import { googleReviews } from "@/content/reviews";

export function localBusinessSchema() {
  const { address, geo, phone, links } = business;

  return {
    "@context": "https://schema.org",
    "@type": "AutoRepair",
    "@id": `${business.siteUrl}/#business`,
    name: business.name,
    url: `${business.siteUrl}/`,
    image: `${business.siteUrl}${business.defaultImage}`,
    logo: `${business.siteUrl}/assets/logo-2.webp`,
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
    geo: {
      "@type": "GeoCoordinates",
      latitude: geo.latitude,
      longitude: geo.longitude,
    },
    hasMap: links.maps,
    areaServed: { "@type": "City", name: "Baytown, TX" },
    openingHoursSpecification: business.hours
      .filter((slot) => slot.days.length)
      .map((slot) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: slot.days,
        opens: slot.opens,
        closes: slot.closes,
      })),
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: googleReviews.rating,
      bestRating: 5,
      worstRating: 1,
      ratingCount: googleReviews.count,
    },
    sameAs: [links.googleProfile, links.facebook],
    description:
      "Family-owned auto repair and mechanic shop offering car alignment, A/C repair, brake repair, suspension, and tire services in Baytown, Texas.",
  };
}
