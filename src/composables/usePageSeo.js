import { useHead } from "@unhead/vue";
import { business, withContact } from "@/config/business";
import { pageGraph } from "@/seo/pageGraph";

export function usePageSeo({ title, description, path, image = business.defaultImage, type, crumbs, mainEntity }) {
  const url = new URL(path, business.siteUrl).href;
  const imageUrl = new URL(image, business.siteUrl).href;
  const fullDescription = withContact(description);
  const graph = pageGraph({ url, type, title, description: fullDescription, imageUrl, crumbs, mainEntity });

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
    script: [{ type: "application/ld+json", key: "graph", innerHTML: JSON.stringify(graph) }],
  });
}
