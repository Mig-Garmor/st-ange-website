<script setup>
import { Icon } from "@iconify/vue";
import { allReviews, reviewThemes } from "@/content/reviews";

const total = allReviews.length;
</script>

<template>
  <div class="review-themes">
    <h3>What customers mention most</h3>
    <p class="review-themes-note">Counted from the {{ total }} written Google reviews. Each theme links to the reviews behind it.</p>
    <ul>
      <li v-for="theme in reviewThemes" :key="theme.id">
        <RouterLink :to="`/reviews#theme-${theme.id}`" class="theme-link">
          <span class="theme-icon" aria-hidden="true">
            <Icon icon="mdi:check-bold" width="18" height="18" />
          </span>
          <span class="theme-text">
            <span class="theme-label">{{ theme.label }}</span>
            <span class="theme-count">Mentioned in {{ theme.count }} of {{ total }} written reviews</span>
          </span>
          <Icon icon="mdi:chevron-right" width="22" height="22" class="theme-arrow" aria-hidden="true" />
        </RouterLink>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.review-themes {
  @apply w-full max-w-3xl mx-auto flex flex-col gap-3;
}
h3 {
  @apply text-[20px] md:text-[22px] font-bold text-brand-navy text-center;
}
.review-themes-note {
  @apply text-center text-[14px] text-gray-600;
}
ul {
  @apply grid gap-2 sm:grid-cols-2;
}
.theme-link {
  @apply flex items-center gap-3 rounded-lg bg-white px-4 py-3 border border-black/10 transition-colors hover:border-brand-navy;
}
.theme-icon {
  @apply grid place-items-center w-8 h-8 shrink-0 rounded-full bg-brand-yellow text-brand-navy;
}
.theme-text {
  @apply flex flex-col flex-1 min-w-0;
}
.theme-label {
  @apply font-semibold text-brand-navy leading-snug;
}
.theme-count {
  @apply text-[13px] text-gray-600;
}
.theme-arrow {
  @apply shrink-0 text-brand-navy/60;
}
</style>
