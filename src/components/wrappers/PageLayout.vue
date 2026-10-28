<script setup>
import PageHeaderComponent from "./PageHeaderComponent.vue";
import PageFooterComponent from "./PageFooterComponent.vue";
import MobileCallBar from "./MobileCallBar.vue";
import RelocationNotice from "./RelocationNotice.vue";

defineProps({
  callBarHiddenOver: { type: String, default: "" },
});
</script>

<template>
  <PageHeaderComponent />
  <RelocationNotice />
  <slot />
  <PageFooterComponent />
  <MobileCallBar :hidden-over="callBarHiddenOver" />
</template>
