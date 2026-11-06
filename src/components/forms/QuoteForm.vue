<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from "vue";

import InputFieldComponent from "@components/forms/InputFieldComponent.vue";
import { MAX_LENGTH, validateName, validatePhone } from "@modules/validate.js";
import { submitForm } from "@api/forms";
import { useFormTurnstile } from "@modules/formTurnstile.js";

const props = defineProps({
  subject: { type: String, required: true },
  service: { type: String, default: null },
});

const emptyForm = () => ({ name: "", phone: "", vehicle: "", notes: "" });

const form = reactive(emptyForm());
const errors = reactive(emptyForm());
const status = ref(""); // "" | "sending" | "success" | "error"
const hasErrors = computed(() => Object.values(errors).some(Boolean));

const challenge = ref(null);
const turnstile = useFormTurnstile(challenge);
onBeforeUnmount(turnstile.remove);

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

const FIELDS = { name: "name", phone: "phone", vehicle: "vehicle", message: "notes" };

function showServerErrors(serverErrors) {
  for (const [key, field] of Object.entries(FIELDS)) if (serverErrors[key]) errors[field] = serverErrors[key];
}

async function handleSubmit() {
  if (!validateForm()) return;

  status.value = "sending";
  errors.notes = "";
  let turnstileToken;
  try {
    turnstileToken = await turnstile.token();
  } catch {
    status.value = "error";
    return;
  }
  status.value = await submitForm("send-email", {
    turnstileToken,
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
  }, { onFieldErrors: showServerErrors });

  if (status.value === "success") {
    Object.assign(form, emptyForm());
    idempotencyKey = null;
  }
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
