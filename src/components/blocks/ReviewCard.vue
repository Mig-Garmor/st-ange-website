<script setup>
import { Icon } from "@iconify/vue";

defineProps({
  author: { type: String, required: true },
  authorUrl: { type: String, default: "" },
  rating: { type: Number, default: 5 },
  text: { type: String, required: true },
  url: { type: String, required: true },
  service: { type: String, default: "" },
});
</script>

<template>
  <figure class="review-card">
    <div class="stars" role="img" :aria-label="`${rating} out of 5 stars`">
      <Icon v-for="n in rating" :key="n" icon="mdi:star" width="20" height="20" aria-hidden="true" />
    </div>
    <blockquote class="review-text" :cite="url">
      <p>“{{ text }}”</p>
    </blockquote>
    <figcaption class="review-meta">
      <a v-if="authorUrl" :href="authorUrl" target="_blank" rel="noopener nofollow" class="review-author">{{ author }}</a>
      <span v-else class="review-author">{{ author }}</span>
      <span class="review-service">{{ service ? `${service} · ` : "" }}Google review</span>
      <a :href="url" target="_blank" rel="noopener" class="review-source">Read on Google ↗</a>
    </figcaption>
  </figure>
</template>

<style scoped>
.review-card {
  @apply flex flex-col gap-3 h-full p-6 rounded-[10px] bg-white shadow-md border border-black/5;
}
.stars {
  @apply flex text-brand-yellow;
}
.review-text {
  @apply flex-1 text-[16px] leading-relaxed text-gray-800;
}
/* The full review stays in the HTML for crawlers; long ones are only clipped on screen. */
.review-text p {
  @apply whitespace-pre-line line-clamp-6;
}
.review-meta {
  @apply flex flex-col gap-0.5;
}
.review-author {
  @apply font-bold text-brand-navy;
}
a.review-author:hover {
  @apply underline underline-offset-2;
}
.review-service {
  @apply text-[13px] text-gray-500;
}
.review-source {
  @apply mt-1 self-start text-[14px] font-semibold text-brand-navy underline underline-offset-2 decoration-brand-yellow hover:decoration-brand-navy;
}
</style>
