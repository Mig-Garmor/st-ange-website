<script setup>
import { useId } from "vue";

defineProps({
  label: { type: String, required: true },
  type: { type: String, default: "text" },
  error: { type: String, default: "" },
  disabled: { type: Boolean, default: false },
  autocomplete: { type: String, default: null },
});

const model = defineModel({ type: String, default: "" });
const id = useId();
</script>

<template>
  <div class="input-wrapper">
    <label class="input-label" :for="id">{{ label }}</label>

    <textarea
      v-if="type === 'textarea'"
      :id="id"
      v-model="model"
      class="input-base"
      rows="5"
      :disabled="disabled"
      :aria-invalid="!!error"
    ></textarea>
    <input
      v-else
      :id="id"
      v-model="model"
      class="input-base"
      :type="type"
      :disabled="disabled"
      :autocomplete="autocomplete"
      :aria-invalid="!!error"
    />

    <p v-if="error" class="error-text">{{ error }}</p>
  </div>
</template>

<style scoped>
.input-wrapper {
  @apply flex flex-col mb-4;
}
.input-label {
  @apply font-semibold mb-1;
}
.input-base {
  @apply border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100;
}
.error-text {
  @apply text-red-500 text-sm mt-1;
}
</style>
