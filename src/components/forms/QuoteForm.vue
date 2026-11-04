<script setup>
import { reactive, ref, watch } from "vue";

import InputFieldComponent from "@components/forms/InputFieldComponent.vue";
import { validateName, validatePhone } from "@modules/validate.js";
import { submitForm } from "@api/forms";

const props = defineProps({
  subject: { type: String, required: true },
  service: { type: String, default: null },
});

const emptyForm = () => ({ name: "", phone: "", vehicle: "", notes: "" });

const form = reactive(emptyForm());
const errors = reactive(emptyForm());
const status = ref(""); // "" | "sending" | "success" | "error"

let idempotencyKey = null;
watch(form, () => {
  idempotencyKey ??= crypto.randomUUID();
});

function validateForm() {
  errors.name = validateName(form.name);
  errors.phone = validatePhone(form.phone);
  errors.vehicle = form.vehicle.trim() ? "" : "Vehicle is required";
  return !errors.name && !errors.phone && !errors.vehicle;
}

async function handleSubmit() {
  if (!validateForm()) return;

  status.value = "sending";
  status.value = await submitForm("send-email", {
    subject: `${props.subject} from ${form.name}`,
    name: form.name,
    email: "",
    phone: form.phone,
    vehicle: form.vehicle,
    message: `Vehicle: ${form.vehicle}\nNotes: ${form.notes || "none"}`,
    source: "quote_form",
    service: props.service,
    pageUrl: location.href,
    idempotencyKey,
  });

  if (status.value === "success") {
    Object.assign(form, emptyForm());
    idempotencyKey = null;
  }
}
</script>

<template>
  <form class="quote-form" novalidate @submit.prevent="handleSubmit">
    <InputFieldComponent v-model="form.name" label="Name" autocomplete="name" :error="errors.name" />
    <InputFieldComponent
      v-model="form.phone"
      label="Phone"
      type="tel"
      autocomplete="tel"
      :error="errors.phone"
    />
    <InputFieldComponent
      v-model="form.vehicle"
      label="Vehicle (year, make, model)"
      :error="errors.vehicle"
    />
    <InputFieldComponent v-model="form.notes" label="What are you noticing? (optional)" type="textarea" />

    <button class="submit-btn" type="submit" :disabled="status === 'sending'">
      {{ status === "sending" ? "Sending…" : "Request my quote" }}
    </button>

    <div v-if="status === 'success'" class="banner-success" role="status">
      Thanks, we got your request. We'll call you back shortly.
    </div>
    <div v-if="status === 'error'" class="banner-error" role="alert">
      Something went wrong. Try again or call us.
    </div>
  </form>
</template>

<style scoped>
.quote-form {
  @apply w-full p-6 border rounded-lg shadow-lg bg-white;
}

.submit-btn {
  @apply w-full bg-brand-navy text-white font-bold py-3 px-4 rounded-lg hover:opacity-90 transition mt-2 disabled:opacity-60;
}

.banner-success {
  @apply mt-4 p-3 bg-green-100 text-green-800 rounded-lg border border-green-200;
}

.banner-error {
  @apply mt-4 p-3 bg-red-100 text-red-800 rounded-lg border border-red-200;
}
</style>
