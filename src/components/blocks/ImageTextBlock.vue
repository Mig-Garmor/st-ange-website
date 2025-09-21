<script setup>
import { useDeviceType } from "@composables/useDeviceType";
import ImageContainer from "./ImageContainer.vue";

defineProps({
  image: { type: String, required: true },
  text: {
    type: String,
    required: true,
  },
});

const { isMobile } = useDeviceType();
</script>

<template>
  <div class="image-text-block-container">
    <ImageContainer :image="image" />
    <div class="text-content">{{ text }}</div>
  </div>
</template>

<style src="@styles/components/blocks/image-text-block.css"></style>
