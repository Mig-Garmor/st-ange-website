// Imported by the build-time structured data check in Node, so only relative imports work here.
import { businessId, businessNode, websiteId, websiteNode } from "./localBusinessSchema.js";
import { breadcrumbNode } from "./serviceSchema.js";

// One connected JSON-LD graph per page, so Google ties the page to the site and the business by @id.
export function pageGraph({ url, type = "WebPage", title, description, imageUrl, crumbs = null, mainEntity = null }) {
  const breadcrumb = crumbs && breadcrumbNode(crumbs, url);
  return {
    "@context": "https://schema.org",
    "@graph": [
      businessNode(),
      websiteNode(),
      {
        "@type": type,
        "@id": `${url}#webpage`,
        url,
        name: title,
        description,
        inLanguage: "en-US",
        isPartOf: { "@id": websiteId },
        about: { "@id": businessId },
        primaryImageOfPage: { "@type": "ImageObject", url: imageUrl },
        ...(breadcrumb && { breadcrumb: { "@id": breadcrumb["@id"] } }),
        ...(mainEntity && { mainEntity: { "@id": mainEntity["@id"] } }),
      },
      ...(breadcrumb ? [breadcrumb] : []),
      ...(mainEntity ? [mainEntity] : []),
    ],
  };
}
