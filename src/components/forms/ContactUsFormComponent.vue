<script setup>
import { reactive, ref, onMounted } from "vue";
import { useRoute } from "vue-router";

import InputFieldComponent from "@components/forms/InputFieldComponent.vue";
import {
  validateName,
  validateEmail,
  validatePhone,
  validateMessage,
} from "@modules/validate.js";
import { submitForm } from "@api/forms";

const route = useRoute();

const emptyForm = () => ({
  name: "",
  email: "",
  confirmEmail: "",
  phone: "",
  message: "",
});

const subject = ref("");
const form = reactive(emptyForm());
const errors = reactive(emptyForm());
const status = ref(""); // "" | "sending" | "success" | "error"

// The query only exists in the browser; reading it at render time breaks hydration of the pre-rendered page.
onMounted(() => {
  subject.value = route.query.subject || "";
});

function validateForm() {
  errors.name = validateName(form.name);
  errors.email = validateEmail(form.email);
  errors.confirmEmail =
    form.email === form.confirmEmail ? "" : "Emails do not match";
  errors.phone = validatePhone(form.phone);
  errors.message = validateMessage(form.message);

  return Object.values(errors).every((error) => !error);
}

async function handleSubmit() {
  if (!validateForm()) return;

  status.value = "sending";
  const { confirmEmail, ...fields } = form;
  status.value = await submitForm("send-email", {
    subject: subject.value,
    ...fields,
  });

  if (status.value === "success") Object.assign(form, emptyForm());
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
      :error="errors.name"
    />
    <InputFieldComponent
      v-model="form.email"
      label="Your Email"
      type="email"
      autocomplete="email"
      :error="errors.email"
    />
    <InputFieldComponent
      v-model="form.confirmEmail"
      label="Confirm Your Email"
      type="email"
      autocomplete="email"
      :error="errors.confirmEmail"
    />
    <InputFieldComponent
      v-model="form.phone"
      label="Phone"
      type="tel"
      autocomplete="tel"
      :error="errors.phone"
    />
    <InputFieldComponent
      v-model="form.message"
      label="Message"
      type="textarea"
      :error="errors.message"
    />

    <button class="submit-btn" type="submit" :disabled="status === 'sending'">
      {{ status === "sending" ? "Sending…" : "Send Email" }}
    </button>

    <div v-if="status === 'success'" class="banner-success" role="status">
      Your message was sent. <br />
      We will be in touch with you shortly.
    </div>
    <div v-if="status === 'error'" class="banner-error" role="alert">
      Something went wrong. Try again or call us.
    </div>
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
