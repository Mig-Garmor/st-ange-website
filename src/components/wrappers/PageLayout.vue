<script setup>
import PageFooterComponent from "./PageFooterComponent.vue";
import PageHeaderComponent from "./PageHeaderComponent.vue";
import PageStickyHeaderComponent from "./PageStickyHeaderComponent.vue";
</script>

<template>
  <PageHeaderComponent />
  <PageStickyHeaderComponent />
  <div class="page-layout-content">
    <slot></slot>
  </div>
  <PageFooterComponent />
</template>

<style src="@styles/components/wrappers/page-layout.css"></style>
