import { useHead } from "@unhead/vue";
import { business } from "@/config/business";

export function usePageSeo({ title, description, path, image = business.defaultImage }) {
  const url = new URL(path, business.siteUrl).href;
  const imageUrl = new URL(image, business.siteUrl).href;

  useHead({
    title,
    meta: [
      { name: "description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: business.name },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:image", content: imageUrl },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    link: [{ rel: "canonical", href: url }],
  });
}
