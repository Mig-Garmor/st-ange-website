<script setup>
import PageFooterComponent from "./PageFooterComponent.vue";
import PageHeaderComponent from "./PageHeaderComponent.vue";
</script>

<template>
  <PageHeaderComponent />
  <slot></slot>
  <PageFooterComponent />
</template>
