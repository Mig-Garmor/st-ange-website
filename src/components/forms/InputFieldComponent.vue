<script setup>
import { ref, watch } from "vue";

const props = defineProps({
  label: String,
  type: {
    type: String,
    default: "text", // text, email, number, textarea
  },
  modelValue: String,
  error: String,
  disabled: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["update:modelValue"]);

const inputValue = ref(props.modelValue || "");

watch(
  () => props.modelValue,
  (val) => {
    inputValue.value = val;
  }
);

function handleInput(e) {
  inputValue.value = e.target.value;
  emit("update:modelValue", inputValue.value);
}
</script>

<template>
  <div class="input-wrapper">
    <label class="input-label" :disabled="disabled">{{ label }}</label>

    <template v-if="type === 'textarea'">
      <textarea
        class="input-base"
        :value="modelValue"
        @input="handleInput"
        :disabled="disabled"
      ></textarea>
    </template>
    <template v-else>
      <input
        class="input-base"
        :type="type"
        :value="modelValue"
        @input="handleInput"
        :disabled="disabled"
      />
    </template>

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
  @apply border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-400;
}
.error-text {
  @apply text-red-500 text-sm mt-1;
}
</style>
