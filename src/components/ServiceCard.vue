<script setup>
defineProps({
  image: { type: String, required: true },
  name: { type: String, required: true },
  to: { type: [String, Object], required: true },
});
</script>

<template>
  <RouterLink :to="to" class="service-card-container">
    <img :src="image" :alt="name" class="service-image" loading="lazy" width="200" height="200" />
    <span class="service-name">{{ name }}</span>
  </RouterLink>
</template>

<style src="@styles/components/service-card.css"></style>
