<script setup>
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";

import ConsentCheckbox from "@components/forms/ConsentCheckbox.vue";
import InputFieldComponent from "@components/forms/InputFieldComponent.vue";
import EmailSuggestion from "../../../chat/widget/EmailSuggestion.vue";
import {
  CONSENT_ERROR,
  MAX_LENGTH,
  validateName,
  validateEmail,
  validatePhone,
  validateMessage,
} from "@modules/validate.js";
import { useLeadForm } from "@modules/useLeadForm.js";
import { services } from "@/config/business";

const route = useRoute();

const subject = ref("");
const challenge = ref(null);
const { form, errors, status, hasErrors, sentEmail, send } = useLeadForm(
  () => ({ name: "", email: "", phone: "", message: "", consent: false }),
  challenge,
);

// The query only exists in the browser; reading it at render time breaks hydration of the pre-rendered page.
onMounted(() => {
  subject.value = route.query.subject || "";
});

function validateForm() {
  errors.name = validateName(form.name);
  errors.email = validateEmail(form.email.trim());
  errors.phone = validatePhone(form.phone);
  errors.message = validateMessage(form.message);
  errors.consent = form.consent ? "" : CONSENT_ERROR;

  return Object.values(errors).every((error) => !error);
}

function showServerErrors(serverErrors) {
  for (const field of ["name", "email", "phone", "message", "consent"]) if (serverErrors[field]) errors[field] = serverErrors[field];
}

async function handleSubmit() {
  if (!validateForm()) return;
  await send({
    ...form,
    email: form.email.trim(),
    source: "contact_form",
    service: services.find((s) => s.name === subject.value)?.slug ?? null,
  }, { onFieldErrors: showServerErrors });
}
</script>

<template>
  <form class="form-wrapper" novalidate @submit.prevent="handleSubmit">
    <InputFieldComponent
      v-if="subject"
      v-model="subject"
      label="Subject"
      disabled
    />
    <InputFieldComponent
      v-model="form.name"
      label="Name"
      autocomplete="name"
      :maxlength="MAX_LENGTH.name"
      :error="errors.name"
    />
    <InputFieldComponent
      v-model="form.email"
      label="Your Email"
      type="email"
      autocomplete="email"
      :maxlength="MAX_LENGTH.email"
      :error="errors.email"
    />
    <EmailSuggestion class="-mt-3 mb-4" :email="form.email" @use="(email) => (form.email = email)" />
    <InputFieldComponent
      v-model="form.phone"
      label="Phone"
      type="tel"
      autocomplete="tel"
      :maxlength="MAX_LENGTH.phone"
      :error="errors.phone"
    />
    <InputFieldComponent
      v-model="form.message"
      label="Message"
      type="textarea"
      :maxlength="2000"
      :error="errors.message"
    />
    <ConsentCheckbox v-model="form.consent" :error="errors.consent" />

    <button class="submit-btn" type="submit" :disabled="status === 'sending'">
      {{ status === "sending" ? "Sending…" : "Send Email" }}
    </button>

    <div v-if="status === 'success'" class="banner-success" role="status">
      Your message was sent. <br />
      We will be in touch with you shortly at <strong>{{ sentEmail }}</strong>.
    </div>
    <div v-if="status === 'error'" class="banner-error" role="alert">
      {{ hasErrors ? "Please check the fields above." : "Something went wrong. Try again or call us." }}
    </div>
    <div ref="challenge"></div>
  </form>
</template>

<style scoped>
.form-wrapper {
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
