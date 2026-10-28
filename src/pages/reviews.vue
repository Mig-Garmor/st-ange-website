<script setup>
import { useHead } from "@unhead/vue";

import PageLayout from "@components/wrappers/PageLayout.vue";
import ReviewCard from "@components/blocks/ReviewCard.vue";
import CallToActionBand from "@components/blocks/CallToActionBand.vue";
import Badge from "@components/utilities/Badge.vue";
import { usePageSeo } from "@composables/usePageSeo";
import { useHashHighlight } from "@composables/useHashHighlight";
import { business } from "@/config/business";
import { allReviewCards, allReviews, googleReviews, reviewThemes } from "@/content/reviews";
import { reviewsSchema } from "@/seo/reviewsSchema";

const rating = googleReviews.rating.toFixed(1);

useHashHighlight();

usePageSeo({
  title: "Customer Reviews | St Ange Auto Service, Baytown TX",
  description: `Rated ${rating} out of 5 from ${googleReviews.count} Google reviews. Every written review of St Ange Auto Service in Baytown, TX, word for word with a link to the original.`,
  path: "/reviews",
});

useHead({
  script: [
    { type: "application/ld+json", key: "reviews", innerHTML: JSON.stringify(reviewsSchema(allReviewCards)) },
  ],
});
</script>

<template>
  <PageLayout>
    <main class="reviews-page">
      <header class="reviews-hero">
        <div class="reviews-hero-inner">
          <h1>St Ange Auto Service Reviews in Baytown, TX</h1>
          <p>
            Rated {{ rating }} out of 5 from {{ googleReviews.count }} Google reviews. Every written review below is
            copied word for word from Google, with a link to the original.
          </p>
        </div>
      </header>

      <section class="reviews-section" aria-labelledby="themes-title">
        <h2 id="themes-title">What customers mention most</h2>
        <p class="reviews-lead">
          Counted from the {{ allReviews.length }} written reviews on {{ googleReviews.capturedAt }}. Select a name to jump to that review.
        </p>
        <div class="themes">
          <div v-for="theme in reviewThemes" :id="`theme-${theme.id}`" :key="theme.id" class="theme">
            <h3>{{ theme.label }}</h3>
            <p class="theme-count">Mentioned in {{ theme.count }} of {{ allReviews.length }} written reviews</p>
            <ul>
              <li v-for="review in theme.reviews" :key="review.id">
                <RouterLink :to="{ hash: `#review-${review.id}` }">{{ review.author }}</RouterLink>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section class="reviews-section" aria-labelledby="all-title">
        <h2 id="all-title">All written reviews</h2>
        <p class="reviews-lead">
          {{ googleReviews.count - allReviews.length }} more customers left a 5-star rating without written text.
        </p>
        <div class="all-reviews">
          <ReviewCard v-for="card in allReviewCards" :key="card.reviewId" v-bind="card" anchor full />
        </div>
        <Badge
          text="Read all reviews on Google"
          icon="carbon:star-review"
          :href="business.links.reviews"
          external
          class="mx-auto"
        />
      </section>

      <CallToActionBand />
    </main>
  </PageLayout>
</template>

<style src="@styles/pages/reviews.css"></style>
