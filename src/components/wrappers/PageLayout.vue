<script setup>
import { useScrollDirection } from "@composables/useScrollDirection";
import PageFooterComponent from "./PageFooterComponent.vue";
import PageHeaderComponent from "./PageHeaderComponent.vue";

const { isAtTop } = useScrollDirection();
</script>

<template>
  <PageHeaderComponent />
  <PageHeaderComponent v-if="!isAtTop" is-sticky="true" />

  <div class="page-layout-content">
    <slot></slot>
  </div>

  <PageFooterComponent />
</template>

<style src="@styles/components/wrappers/page-layout.css"></style>
