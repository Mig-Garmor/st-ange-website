<script setup>
import { Icon } from "@iconify/vue";

defineProps({
  icon: { type: String, required: true },
  text: { type: String, required: true },
  href: { type: String, default: null },
  external: { type: Boolean, default: false },
  iconSize: { type: [Number, String], default: 24 },
});
</script>

<template>
  <component
    :is="href ? 'a' : 'span'"
    class="icon-text-container"
    :href="href"
    :target="external ? '_blank' : null"
    :rel="external ? 'noopener' : null"
  >
    <Icon :icon="icon" :width="iconSize" :height="iconSize" aria-hidden="true" />
    <span>{{ text }}</span>
  </component>
</template>

<style src="@styles/components/utilities/icon-text.css"></style>
