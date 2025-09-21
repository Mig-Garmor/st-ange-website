<script setup>
defineProps({ image: { type: String, required: true } });
</script>

<template>
  <div
    class="image-container"
    :style="{ backgroundImage: `url(${image})` }"
  ></div>
</template>

<style src="@styles/components/blocks/image-container.css"></style>
