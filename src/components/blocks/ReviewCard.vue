<script setup>
import { Icon } from "@iconify/vue";

defineProps({
  author: { type: String, required: true },
  service: { type: String, default: "" },
  text: { type: String, required: true },
});
</script>

<template>
  <figure class="review-card">
    <div class="stars" aria-label="5 out of 5 stars">
      <Icon v-for="n in 5" :key="n" icon="mdi:star" width="20" height="20" aria-hidden="true" />
    </div>
    <blockquote class="review-text">“{{ text }}”</blockquote>
    <figcaption class="review-author">
      {{ author }}
      <span v-if="service" class="review-service">{{ service }} · Google review</span>
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
.review-author {
  @apply font-bold text-brand-navy;
}
.review-service {
  @apply block text-[13px] font-normal text-gray-500;
}
</style>
