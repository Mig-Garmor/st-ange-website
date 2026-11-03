import { business } from "@/config/business";

const absolute = (path) => new URL(path, business.siteUrl).href;

export function breadcrumbSchema(crumbs) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.label,
      item: absolute(crumb.to),
    })),
  };
}

export function serviceSchema(service) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    serviceType: service.name,
    description: service.metaDescription,
    url: absolute(`/services/${service.slug}`),
    provider: { "@id": `${business.siteUrl}/#business` },
    areaServed: service.zips
      ? [
          { "@type": "City", name: "Baytown, TX" },
          ...service.zips.map((postalCode) => ({
            "@type": "Place",
            address: { "@type": "PostalAddress", addressLocality: "Baytown", addressRegion: "TX", postalCode },
          })),
        ]
      : { "@type": "City", name: "Baytown, TX" },
  };
}
