<script setup>
import { Icon } from "@iconify/vue";

defineProps({
  icon: {
    type: String,
    required: true,
  },
  iconWidth: {
    type: [Number, String],
    default: 24,
  },
  iconHeight: {
    type: [Number, String],
    default: 24,
  },
  text: {
    type: String,
    required: true,
  },
  link: {
    type: Boolean,
    default: false,
  },
  color: {
    type: String,
    default: "#011F7C",
  },
});
</script>

<template>
  <div class="icon-text-container">
    <Icon :icon="icon" :width="iconWidth" :height="iconHeight" />
    <a :href="link ?? null" class="text" v-html="text" target="_blank"></a>
  </div>
</template>

<style src="@styles/components/utilities/icon-text.css"></style>
