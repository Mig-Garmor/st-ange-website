<script setup>
import { Icon } from "@iconify/vue";
import { business } from "@/config/business";
</script>

<template>
  <nav class="mobile-call-bar" aria-label="Quick contact">
    <a :href="business.phone.href" class="call">
      <Icon icon="mdi:phone" width="20" height="20" aria-hidden="true" />
      Call {{ business.phone.display }}
    </a>
    <a :href="business.links.maps" target="_blank" rel="noopener" class="directions">
      <Icon icon="mdi:directions" width="20" height="20" aria-hidden="true" />
      Directions
    </a>
  </nav>
</template>

<style scoped>
.mobile-call-bar {
  @apply fixed inset-x-0 bottom-0 z-[998] grid grid-cols-[3fr_2fr] md:hidden;
  @apply border-t-2 border-brand-navy shadow-[0_-4px_12px_rgba(0,0,0,0.15)];
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
.mobile-call-bar a {
  @apply flex items-center justify-center gap-2 py-3 font-bold text-[16px];
}
.call {
  @apply bg-brand-yellow text-brand-navy;
}
.directions {
  @apply bg-brand-navy text-white;
}
</style>
