<script setup>
import { computed } from "vue";
import { suggestEmail } from "../lead.js";

// Shown under any email field (website forms and the chat request card): one tap fixes a likely typo, and it never blocks sending.
const props = defineProps({ email: { type: String, default: "" } });
const emit = defineEmits(["use"]);
const suggestion = computed(() => suggestEmail(props.email.trim()));
</script>

<template>
  <p v-if="suggestion" class="email-suggestion" aria-live="polite">
    Did you mean
    <button type="button" @click="emit('use', suggestion)">{{ suggestion }}</button>?
  </p>
</template>

<style scoped>
.email-suggestion {
  @apply mt-1 text-sm text-gray-600;
}

.email-suggestion button {
  @apply font-semibold text-brand-navy underline underline-offset-2;
}
</style>
