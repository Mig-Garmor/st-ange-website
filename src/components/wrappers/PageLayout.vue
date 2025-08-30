<script setup>
import { useScrollDirection } from "@/composables/useScrollDirection";

import PageFooterComponent from "./PageFooterComponent.vue";
import PageHeaderComponent from "./PageHeaderComponent.vue";
import PageStickyHeaderComponent from "./PageStickyHeaderComponent.vue";

const { isScrollingUp } = useScrollDirection();

console.log("isScrollingUp: ", isScrollingUp);
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
