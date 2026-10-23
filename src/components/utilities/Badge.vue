<script setup>
import { Icon } from "@iconify/vue";

defineProps({
  text: { type: String, required: true },
  icon: { type: String, default: null },
  iconSize: { type: [Number, String], default: 24 },
  href: { type: String, default: null },
  to: { type: [String, Object], default: null },
  external: { type: Boolean, default: false },
});
</script>

<template>
  <RouterLink v-if="to" :to="to" class="badge-component">
    <Icon v-if="icon" :icon="icon" :width="iconSize" :height="iconSize" aria-hidden="true" />
    {{ text }}
  </RouterLink>
  <a
    v-else
    :href="href"
    class="badge-component"
    :target="external ? '_blank' : null"
    :rel="external ? 'noopener' : null"
  >
    <Icon v-if="icon" :icon="icon" :width="iconSize" :height="iconSize" aria-hidden="true" />
    {{ text }}
  </a>
</template>

<style src="@styles/components/utilities/badge.css"></style>
