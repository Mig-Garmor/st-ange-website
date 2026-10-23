<script setup>
defineProps({
  image: { type: String, required: true },
  alt: { type: String, required: true },
  text: { type: String, required: true },
});
</script>

<template>
  <div class="image-text-block-container">
    <p class="text-content">{{ text }}</p>
    <img :src="image" :alt="alt" class="block-image" loading="lazy" width="200" height="200" />
  </div>
</template>

<style src="@styles/components/blocks/image-text-block.css"></style>
