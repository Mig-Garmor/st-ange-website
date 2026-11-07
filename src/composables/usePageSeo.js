import { useHead } from "@unhead/vue";
import { business, withContact } from "@/config/business";
import { breadcrumbSchema } from "@/seo/serviceSchema";

export function usePageSeo({ title, description, path, image = business.defaultImage, crumbs = null }) {
  const url = new URL(path, business.siteUrl).href;
  const imageUrl = new URL(image, business.siteUrl).href;
  const fullDescription = withContact(description);

  useHead({
    title,
    meta: [
      { name: "description", content: fullDescription },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: business.name },
      { property: "og:title", content: title },
      { property: "og:description", content: fullDescription },
      { property: "og:url", content: url },
      { property: "og:image", content: imageUrl },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    link: [{ rel: "canonical", href: url }],
    script: crumbs
      ? [{ type: "application/ld+json", key: "breadcrumbs", innerHTML: JSON.stringify(breadcrumbSchema(crumbs)) }]
      : [],
  });
}
