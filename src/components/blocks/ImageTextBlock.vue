<script setup>
defineProps({
  image: { type: String, required: true },
  alt: { type: String, required: true },
  title: { type: String, required: true },
  text: { type: String, required: true },
  link: { type: Object, default: null },
  reversed: { type: Boolean, default: false },
});
</script>

<template>
  <article class="image-text-block-container" :class="{ 'is-reversed': reversed }">
    <img :src="image" :alt="alt" class="block-image" loading="lazy" width="1080" height="1080" />
    <div class="text-content">
      <h2>{{ title }}</h2>
      <p>{{ text }}</p>
      <RouterLink v-if="link" :to="link.to" class="block-link">{{ link.label }} →</RouterLink>
    </div>
  </article>
</template>

<style src="@styles/components/blocks/image-text-block.css"></style>
