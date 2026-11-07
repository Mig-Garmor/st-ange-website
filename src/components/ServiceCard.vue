<script setup>
defineProps({
  image: { type: String, required: true },
  name: { type: String, required: true },
  to: { type: [String, Object], required: true },
  summary: { type: String, default: "" },
  // The service's slug: clicks on the card are counted in Website Hub as service_click.
  service: { type: String, default: "" },
});
</script>

<template>
  <RouterLink
    :to="to"
    class="service-card"
    :data-hub-tag="service ? 'service_click' : null"
    :data-hub-service="service || null"
  >
    <span class="service-card-container">
      <img :src="image" :alt="name" class="service-image" loading="lazy" width="200" height="200" />
      <span class="service-name">{{ name }}</span>
    </span>
    <span v-if="summary" class="service-summary">{{ summary }}</span>
  </RouterLink>
</template>

<style src="@styles/components/service-card.css"></style>
