<script setup>
defineProps({
  items: { type: Array, required: true },
});
</script>

<template>
  <div class="faq-list">
    <details v-for="item in items" :key="item.question" class="faq-item">
      <summary>{{ item.question }}</summary>
      <p>{{ item.answer }}</p>
    </details>
  </div>
</template>

<style scoped>
.faq-list {
  @apply flex flex-col gap-3 w-full;
}
.faq-item {
  @apply rounded-[10px] bg-white border border-black/10 px-5 py-4;
}
summary {
  @apply cursor-pointer font-bold text-[17px] text-brand-navy list-none flex justify-between items-center gap-4;
}
summary::after {
  content: "+";
  @apply text-[24px] leading-none shrink-0;
}
.faq-item[open] summary::after {
  content: "–";
}
.faq-item p {
  @apply mt-3 text-gray-700 leading-relaxed;
}
</style>
