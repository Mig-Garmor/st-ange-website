<script setup>
import { useDeviceType } from "@composables/useDeviceType";
import ImageContainer from "./ImageContainer.vue";

defineProps({
  image: { type: String, required: true },
  text: {
    type: String,
    required: true,
  },
  alt: {
    type: String,
    required: true,
  },
});

const { isMobile } = useDeviceType();
</script>

<template>
  <div class="image-text-block-container">
    <div class="text-content">{{ text }}</div>
    <ImageContainer :image="image" :alt="alt" />
  </div>
</template>

<style src="@styles/components/blocks/image-text-block.css"></style>
