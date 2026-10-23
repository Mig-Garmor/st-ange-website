<script setup>
defineProps({
  crumbs: { type: Array, required: true },
});
</script>

<template>
  <nav aria-label="Breadcrumb" class="breadcrumbs">
    <ol>
      <li v-for="(crumb, index) in crumbs" :key="crumb.to">
        <RouterLink v-if="index < crumbs.length - 1" :to="crumb.to">{{ crumb.label }}</RouterLink>
        <span v-else aria-current="page">{{ crumb.label }}</span>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
ol {
  @apply flex flex-wrap gap-2 text-[14px] text-white/85;
}
li:not(:last-child)::after {
  content: "›";
  @apply ml-2;
}
a {
  @apply underline underline-offset-2 hover:text-white;
}
</style>
