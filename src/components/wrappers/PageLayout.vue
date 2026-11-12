<script setup>
import PageHeaderComponent from "./PageHeaderComponent.vue";
import PageFooterComponent from "./PageFooterComponent.vue";
import MobileCallBar from "./MobileCallBar.vue";
import RelocationNotice from "./RelocationNotice.vue";
import ChatBubble from "../../../chat/widget/ChatBubble.vue";
import { chatClientSettings } from "@/chatSettings.client.js";

defineProps({
  callBarHiddenOver: { type: String, default: "" },
});
</script>

<template>
  <a href="#main" class="skip-link">Skip to main content</a>
  <PageHeaderComponent />
  <RelocationNotice />
  <slot />
  <PageFooterComponent />
  <MobileCallBar :hidden-over="callBarHiddenOver" />
  <ChatBubble :settings="chatClientSettings" />
</template>
