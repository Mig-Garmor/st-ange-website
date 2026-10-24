<script setup>
import PageHeaderComponent from "./PageHeaderComponent.vue";
import PageFooterComponent from "./PageFooterComponent.vue";
import MobileCallBar from "./MobileCallBar.vue";
import RelocationNotice from "./RelocationNotice.vue";
</script>

<template>
  <PageHeaderComponent />
  <RelocationNotice />
  <slot />
  <PageFooterComponent />
  <MobileCallBar />
</template>
