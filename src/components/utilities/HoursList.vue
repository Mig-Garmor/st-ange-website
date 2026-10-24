<script setup>
import { business } from "@/config/business";

defineProps({
  compact: { type: Boolean, default: false },
});
</script>

<template>
  <dl class="hours-list">
    <template v-for="slot in business.hours" :key="slot.label">
      <dt>{{ compact ? slot.shortLabel : slot.label }}</dt>
      <dd>{{ slot.display }}</dd>
    </template>
  </dl>
</template>

<style scoped>
.hours-list {
  @apply grid grid-cols-[auto_1fr] gap-x-4 gap-y-1;
}
dt {
  @apply font-semibold;
}
dd {
  @apply whitespace-nowrap;
}
</style>
