// Imported by the build-time structured data check in Node, so only relative imports work here.
import { business } from "../config/business.js";
import { businessId, serviceId } from "./localBusinessSchema.js";

const absolute = (path) => new URL(path, business.siteUrl).href;

export function breadcrumbNode(crumbs, pageUrl) {
  return {
    "@type": "BreadcrumbList",
    "@id": `${pageUrl}#breadcrumb`,
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.label,
      item: absolute(crumb.to),
    })),
  };
}

export function serviceNode(service) {
  return {
    "@type": "Service",
    "@id": serviceId(service.slug),
    name: service.name,
    serviceType: service.name,
    description: service.metaDescription,
    url: absolute(`/services/${service.slug}`),
    provider: { "@id": businessId },
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
