<script setup>
import { ref } from "vue";

import InputFieldComponent from "@components/forms/InputFieldComponent.vue";
import { MAX_LENGTH, validateEmail, validateName, validatePhone } from "@modules/validate.js";
import { useLeadForm } from "@modules/useLeadForm.js";

const props = defineProps({
  service: { type: String, default: null },
});

const challenge = ref(null);
const { form, errors, status, hasErrors, send } = useLeadForm(() => ({ name: "", phone: "", email: "", vehicle: "", notes: "" }), challenge);

function validateForm() {
  errors.name = validateName(form.name);
  errors.phone = validatePhone(form.phone);
  errors.email = validateEmail(form.email.trim());
  errors.vehicle = form.vehicle.trim() ? "" : "Vehicle is required";
  return !errors.name && !errors.phone && !errors.email && !errors.vehicle;
}

const FIELDS = { name: "name", phone: "phone", email: "email", vehicle: "vehicle", message: "notes" };

function showServerErrors(serverErrors) {
  for (const [key, field] of Object.entries(FIELDS)) if (serverErrors[key]) errors[field] = serverErrors[key];
}

async function handleSubmit() {
  if (!validateForm()) return;
  errors.notes = "";
  await send({
    name: form.name,
    phone: form.phone,
    email: form.email.trim(),
    vehicle: form.vehicle,
    message: `Vehicle: ${form.vehicle}\nNotes: ${form.notes || "none"}`,
    source: "quote_form",
    service: props.service,
  }, { onFieldErrors: showServerErrors });
}
</script>

<template>
  <form class="quote-form" novalidate @submit.prevent="handleSubmit">
    <InputFieldComponent
      v-model="form.name"
      label="Name"
      autocomplete="name"
      :maxlength="MAX_LENGTH.name"
      :error="errors.name"
    />
    <InputFieldComponent
      v-model="form.phone"
      label="Phone"
      type="tel"
      autocomplete="tel"
      :maxlength="MAX_LENGTH.phone"
      :error="errors.phone"
    />
    <InputFieldComponent
      v-model="form.email"
      label="Email"
      type="email"
      autocomplete="email"
      :maxlength="MAX_LENGTH.email"
      :error="errors.email"
    />
    <InputFieldComponent
      v-model="form.vehicle"
      label="Vehicle (year, make, model)"
      :maxlength="MAX_LENGTH.vehicle"
      :error="errors.vehicle"
    />
    <InputFieldComponent
      v-model="form.notes"
      label="What are you noticing? (optional)"
      type="textarea"
      :maxlength="1800"
      :error="errors.notes"
    />

    <button class="submit-btn" type="submit" :disabled="status === 'sending'">
      {{ status === "sending" ? "Sending…" : "Request my quote" }}
    </button>

    <div v-if="status === 'success'" class="banner-success" role="status">
      Thanks, we got your request. We'll call you back shortly.
    </div>
    <div v-if="status === 'error'" class="banner-error" role="alert">
      {{ hasErrors ? "Please check the fields above." : "Something went wrong. Try again or call us." }}
    </div>
    <div ref="challenge"></div>
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
