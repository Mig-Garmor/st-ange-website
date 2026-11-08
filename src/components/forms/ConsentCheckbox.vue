<script setup>
import { business } from "@/config/business";

defineProps({ error: { type: [String, Boolean], default: "" } });
const model = defineModel({ type: Boolean, default: false });
</script>

<template>
  <div class="consent-wrapper">
    <label class="consent">
      <input v-model="model" type="checkbox" :aria-invalid="!!error" />
      <span>{{ business.callbackConsent }}</span>
    </label>
    <p v-if="error" class="error-text">{{ error }}</p>
  </div>
</template>

<style scoped>
.consent-wrapper {
  @apply mb-4;
}
.consent {
  @apply flex items-start gap-2 rounded-lg bg-brand-yellow/20 p-3 text-sm leading-snug;
}
.consent input {
  @apply mt-0.5 h-4 w-4 shrink-0 accent-brand-navy;
}
.error-text {
  @apply text-red-500 text-sm mt-1;
}
</style>
