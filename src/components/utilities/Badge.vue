<script setup>
import { computed } from "vue";
import { Icon } from "@iconify/vue";

const props = defineProps({
  text: { type: String, required: true },
  icon: { type: String, default: null },
  iconWidth: { type: [Number, String], default: 20 },
  iconHeight: { type: [Number, String], default: 20 },
  action: { type: Function, default: null },
});

const handleClick = () => {
  if (props.action) {
    props.action();
  }
};
</script>

<template>
  <div
    class="badge-component"
    :class="action && 'cursor-pointer'"
    @click="handleClick"
  >
    <Icon v-if="icon" :icon="icon" :width="iconWidth" :height="iconHeight" />
    {{ text }}
  </div>
</template>

<style src="@styles/components/utilities/badge.css"></style>
