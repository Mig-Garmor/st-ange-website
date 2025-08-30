<script setup>
import { useScrollDirection } from "@composables/useScrollDirection";
import PageFooterComponent from "./PageFooterComponent.vue";
import PageHeaderComponent from "./PageHeaderComponent.vue";
import PageStickyHeaderComponent from "./PageStickyHeaderComponent.vue";

const { isAtTop } = useScrollDirection();
</script>

<template>
  <PageHeaderComponent />
  <PageStickyHeaderComponent v-if="!isAtTop" />

  <div class="page-layout-content">
    <slot></slot>
  </div>

  <PageFooterComponent />
</template>

<style src="@styles/components/wrappers/page-layout.css"></style>
