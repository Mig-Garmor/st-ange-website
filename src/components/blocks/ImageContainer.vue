<script setup>
defineProps({ image: { type: String, required: true, alt: { type: String } } });
</script>

<template>
  <div
    class="image-container"
    :style="{ backgroundImage: `url(${image})` }"
    role="img"
    :aria-label="alt"
  ></div>
</template>

<style src="@styles/components/blocks/image-container.css"></style>
