<script setup>
defineProps({
  image: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
});
</script>

<template>
  <div
    class="service-card-container"
    :style="{ backgroundImage: `url(${image})` }"
  >
    <div class="service-name">{{ name }}</div>
  </div>
</template>

<style src="@styles/components/service-card.css"></style>
