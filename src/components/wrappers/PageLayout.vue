<script setup>
import PageHeaderComponent from "./PageHeaderComponent.vue";
import PageFooterComponent from "./PageFooterComponent.vue";
import MobileCallBar from "./MobileCallBar.vue";
</script>

<template>
  <PageHeaderComponent />
  <slot />
  <PageFooterComponent />
  <MobileCallBar />
</template>
