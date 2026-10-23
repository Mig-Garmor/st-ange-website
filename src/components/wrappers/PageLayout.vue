<script setup>
import PageHeaderComponent from "./PageHeaderComponent.vue";
import PageFooterComponent from "./PageFooterComponent.vue";
</script>

<template>
  <PageHeaderComponent />
  <slot />
  <PageFooterComponent />
</template>
