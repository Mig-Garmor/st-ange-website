<script setup>
import { Icon } from "@iconify/vue";

defineProps({
  text: { type: String, required: true },
  icon: { type: String, default: null },
  iconWidth: { type: [Number, String], default: 20 },
  iconHeight: { type: [Number, String], default: 20 },
});
</script>

<template>
  <div class="badge-component">
    <Icon v-if="icon" :icon="icon" :width="iconWidth" :height="iconHeight" />
    {{ text }}
  </div>
</template>

<style src="@styles/components/particles/badge.css"></style>
