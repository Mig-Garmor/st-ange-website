import { business } from "@/config/business";

export function reviewsSchema(cards) {
  return {
    "@context": "https://schema.org",
    "@graph": cards.map((card) => ({
      "@type": "Review",
      url: card.url,
      reviewBody: card.text,
      reviewRating: { "@type": "Rating", ratingValue: card.rating, bestRating: 5, worstRating: 1 },
      author: { "@type": "Person", name: card.author, ...(card.authorUrl && { url: card.authorUrl }) },
      publisher: { "@type": "Organization", name: "Google", url: "https://www.google.com/maps" },
      itemReviewed: { "@id": `${business.siteUrl}/#business` },
    })),
  };
}
