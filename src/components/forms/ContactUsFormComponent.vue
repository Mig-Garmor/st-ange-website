<script setup>
import { ref } from "vue";
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
const subject = ref(route.query.subject || "");

const name = ref("");
const email = ref("");
const confirmEmail = ref("");
const phone = ref("");
const message = ref("");

const errors = ref({
  name: "",
  email: "",
  confirmEmail: "",
  phone: "",
  message: "",
});

const submissionStatus = ref(""); // 'success' | 'error' | ''

function validateForm() {
  errors.value.name = validateName(name.value);
  errors.value.email = validateEmail(email.value);
  errors.value.confirmEmail =
    email.value === confirmEmail.value ? "" : "Emails do not match";
  errors.value.phone = validatePhone(phone.value);
  errors.value.message = validateMessage(message.value);

  return !Object.values(errors.value).some((e) => e !== "");
}

async function handleSubmit() {
  if (!validateForm()) return;

  submissionStatus.value = ""; // reset

  const formData = {
    subject: subject.value,
    name: name.value,
    email: email.value,
    phone: phone.value,
    message: message.value,
  };

  const formResponse = await submitForm("send-email", formData);

  if (formResponse === "success") {
    name.value = "";
    email.value = "";
    confirmEmail.value = "";
    phone.value = "";
    message.value = "";
  }
}
</script>

<template>
  <form class="form-wrapper" @submit.prevent="handleSubmit">
    <InputFieldComponent
      v-if="subject"
      label="Subject"
      v-model="subject"
      type="text"
      :disabled="true"
    />
    <InputFieldComponent
      label="Name"
      v-model="name"
      :error="errors.name"
      type="text"
    />
    <InputFieldComponent
      label="Your Email"
      v-model="email"
      :error="errors.email"
      type="email"
    />
    <InputFieldComponent
      label="Confirm Your Email"
      v-model="confirmEmail"
      :error="errors.confirmEmail"
      type="email"
    />
    <InputFieldComponent
      label="Phone"
      v-model="phone"
      :error="errors.phone"
      type="number"
    />
    <InputFieldComponent
      label="Message"
      v-model="message"
      :error="errors.message"
      type="textarea"
    />

    <button class="submit-btn" type="submit" aria-label="Send Email">
      Send Email
    </button>

    <!-- Success Banner -->
    <div v-if="submissionStatus === 'success'" class="banner-success">
      Your message was sent. <br />
      We will be in touch with you shortly
    </div>

    <!-- Error Banner -->
    <div v-if="submissionStatus === 'error'" class="banner-error">
      Something went wrong. Try again or call us.
    </div>
  </form>
</template>

<style scoped>
.form-wrapper {
  @apply max-w-md mx-auto p-6 border rounded-lg shadow-lg bg-white;
}

.submit-btn {
  @apply bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition mt-2;
}

/* Success Banner */
.banner-success {
  @apply mt-4 p-3 bg-green-100 text-green-800 rounded-lg border border-green-200;
}

/* Error Banner */
.banner-error {
  @apply mt-4 p-3 bg-red-100 text-red-800 rounded-lg border border-red-200;
}
</style>
