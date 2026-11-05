<script setup>
import { computed, nextTick, reactive, ref, useId, watch } from "vue";
import { STEPS, fieldError, firstIncompleteStep, initialForm, okCard, stepErrors } from "./card.js";

const props = defineProps({
  proposal: { type: Object, required: true },
  conversationId: { type: String, required: true },
  services: { type: Array, default: () => [] },
  phoneDisplay: { type: String, required: true },
  phoneHref: { type: String, required: true },
  superseded: { type: Boolean, default: false },
  localAreaCodes: { type: Array, default: () => [] },
});
const emit = defineEmits(["sent"]);

const rules = { localAreaCodes: props.localAreaCodes };
const form = reactive(initialForm(okCard(props.proposal)));
const errors = reactive({});
const step = ref(firstIncompleteStep(form, rules));
const confirmed = ref(false);
watch(() => [form.phone, form.email], () => (confirmed.value = false));
const status = ref("");
const root = ref(null);
const uid = useId();
// Derived from the tool call, so a reload re-sends with the same key and the shop is not emailed twice.
const idempotencyKey = `${props.conversationId}:${props.proposal.toolCallId}`;

const last = STEPS.length - 1;
const serviceName = computed(() => props.services.find((s) => s.slug === form.service)?.name ?? "Not sure yet");
const locked = computed(() => status.value === "sending" || status.value === "sent");
// Sending is the last stage, so the bar only fills once the shop has the request.
const progress = computed(() => (status.value === "sent" ? 100 : Math.round(((step.value + 1) / (STEPS.length + 1)) * 100)));

function check(field) {
  const message = fieldError(field, form[field], rules);
  if (message) errors[field] = message;
  else delete errors[field];
}

function showStep(found) {
  for (const key of Object.keys(errors)) delete errors[key];
  Object.assign(errors, found);
  nextTick(() => {
    root.value?.scrollIntoView({ block: "nearest" });
    const fields = root.value?.querySelector(".fields");
    (fields?.querySelector("[aria-invalid='true']") ?? fields?.querySelector("input, select, textarea"))?.focus();
  });
}

function next() {
  const found = stepErrors(form, step.value, rules);
  if (Object.keys(found).length) return showStep(found);
  step.value += 1;
  showStep({});
}

function back() {
  step.value = Math.max(0, step.value - 1);
  showStep({});
}

async function send() {
  if (locked.value || props.superseded || !confirmed.value) return;
  const broken = STEPS.findIndex((_, s) => Object.keys(stepErrors(form, s, rules)).length);
  if (broken !== -1) {
    step.value = broken;
    return showStep(stepErrors(form, broken, rules));
  }
  status.value = "sending";
  try {
    const response = await fetch("/api/chat-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId: props.conversationId,
        idempotencyKey,
        ...form,
        service: form.service || null,
        pageUrl: location.href,
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (response.status === 400 && result.status === "invalid") {
      status.value = "";
      const field = Object.keys(result.errors ?? {})[0];
      const owner = STEPS.findIndex((s) => s.fields.includes(field));
      if (owner !== -1) step.value = owner;
      return showStep(result.errors ?? {});
    }
    status.value = response.ok && result.status === "sent" ? "sent" : "failed";
    if (status.value === "sent") emit("sent");
  } catch {
    status.value = "failed";
  }
}
</script>

<template>
  <section ref="root" class="request-card" :aria-labelledby="`${uid}-title`">
    <h3 :id="`${uid}-title`" class="title">Your request</h3>

    <template v-if="!superseded">
      <p class="step-label">
        <template v-if="status === 'sent'">Done</template>
        <template v-else>Step {{ step + 1 }} of {{ STEPS.length }} · {{ STEPS[step].title }}</template>
      </p>
      <div
        class="progress"
        role="progressbar"
        aria-label="Request progress"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="progress"
      >
        <span :style="{ width: `${progress}%` }"></span>
      </div>
    </template>

    <dl v-if="superseded || locked" class="summary">
      <dt>Service</dt><dd>{{ serviceName }}</dd>
      <dt>Vehicle</dt><dd>{{ form.vehicle || "Not given" }}</dd>
      <template v-if="form.notes"><dt>Notes</dt><dd>{{ form.notes }}</dd></template>
      <dt>Name</dt><dd>{{ form.name || "Not given" }}</dd>
      <dt>Phone</dt><dd class="contact">{{ form.phone || "Not given" }}</dd>
      <dt>Email</dt><dd class="contact">{{ form.email || "Not given" }}</dd>
    </dl>

    <form v-else class="fields" novalidate @submit.prevent="step < last ? next() : send()">
      <template v-if="step === 0">
        <label :for="`${uid}-service`">Service</label>
        <select :id="`${uid}-service`" v-model="form.service">
          <option value="">Not sure yet</option>
          <option v-for="service in services" :key="service.slug" :value="service.slug">{{ service.name }}</option>
        </select>

        <label :for="`${uid}-vehicle`">Vehicle (year, make and model)</label>
        <input :id="`${uid}-vehicle`" v-model="form.vehicle" maxlength="100" placeholder="2018 Toyota Camry" @input="check('vehicle')" :aria-invalid="!!errors.vehicle" />
        <p v-if="errors.vehicle" class="error">{{ errors.vehicle }}</p>

        <label :for="`${uid}-notes`">What's going on? <span class="optional">(optional)</span></label>
        <textarea :id="`${uid}-notes`" v-model="form.notes" maxlength="1000" rows="2"></textarea>
      </template>

      <template v-else-if="step === 1">
        <label :for="`${uid}-name`">Name</label>
        <input :id="`${uid}-name`" v-model="form.name" maxlength="100" autocomplete="name" @input="check('name')" :aria-invalid="!!errors.name" />
        <p v-if="errors.name" class="error">{{ errors.name }}</p>

        <label :for="`${uid}-phone`">Phone</label>
        <input :id="`${uid}-phone`" v-model="form.phone" maxlength="30" type="tel" autocomplete="tel" @input="check('phone')" :aria-invalid="!!errors.phone" />
        <p v-if="errors.phone" class="error">{{ errors.phone }}</p>
      </template>

      <template v-else>
        <label :for="`${uid}-email`">Email</label>
        <input :id="`${uid}-email`" v-model="form.email" maxlength="200" type="email" autocomplete="email" @input="check('email')" :aria-invalid="!!errors.email" />
        <p v-if="errors.email" class="error">{{ errors.email }}</p>

        <dl class="summary review">
          <dt>Service</dt><dd>{{ serviceName }}</dd>
          <dt>Vehicle</dt><dd>{{ form.vehicle }}</dd>
          <dt>Name</dt><dd>{{ form.name }}</dd>
          <dt>Phone</dt><dd class="contact">{{ form.phone }}</dd>
        </dl>

        <label class="confirm">
          <input v-model="confirmed" type="checkbox" />
          <span>My phone number and email are correct, so the shop can reach me.</span>
        </label>
      </template>

      <div class="actions" :class="{ 'has-back': step > 0 }">
        <button v-if="step > 0" type="button" class="back" @click="back">Back</button>
        <button v-if="step < last" type="submit" class="primary">Next</button>
        <button v-else type="submit" class="primary" :disabled="!confirmed">Send request</button>
      </div>
    </form>

    <p v-if="status === 'sending'" class="sending" role="status">Sending…</p>
    <p v-else-if="status === 'sent'" class="banner-success" role="status">Sent. We'll call you back shortly.</p>
    <p v-else-if="status === 'failed'" class="banner-error" role="alert">
      We couldn't send your request. Please call us at
      <a :href="phoneHref">{{ phoneDisplay }}</a>.
    </p>

    <p v-if="superseded && status !== 'sent'" class="superseded">Replaced by the updated details below.</p>
  </section>
</template>

<style scoped>
.superseded {
  @apply mt-2 text-[13px] italic text-gray-500;
}
.request-card {
  @apply w-full rounded-lg border border-gray-200 bg-white p-3 shadow-sm text-sm;
}
.title {
  @apply font-bold text-brand-navy;
}
.step-label {
  @apply mt-1 text-[13px] font-semibold text-gray-600;
}
.progress {
  @apply mt-1 mb-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200;
}
.progress span {
  @apply block h-full rounded-full bg-brand-navy transition-[width] duration-300 ease-out;
}
.fields {
  @apply flex flex-col;
}
.fields label {
  @apply mt-2 mb-1 font-semibold;
}
.optional {
  @apply font-normal text-gray-500;
}
.fields input,
.fields select,
.fields textarea {
  @apply rounded-lg border border-gray-300 p-2 text-[16px] focus:outline-none focus:ring-2 focus:ring-blue-400;
}
.error {
  @apply mt-1 text-red-500 text-xs;
}
.summary {
  @apply grid grid-cols-[auto_1fr] gap-x-3 gap-y-1;
}
.summary.review {
  @apply mt-3 rounded-lg bg-gray-50 p-2 text-[13px];
}
.summary dt {
  @apply font-semibold text-gray-600;
}
.summary dd {
  @apply break-words;
}
.summary .contact {
  @apply font-semibold text-brand-navy;
}
.fields .confirm {
  @apply mt-3 mb-0 flex items-start gap-2 rounded-lg bg-brand-yellow/20 p-2 text-[13px] font-normal leading-snug;
}
.fields .confirm input {
  @apply mt-0.5 h-4 w-4 shrink-0 p-0 accent-brand-navy;
}
.actions {
  @apply mt-3 grid grid-cols-1 gap-2;
}
.actions.has-back {
  @apply grid-cols-[1fr_2fr];
}
.primary {
  @apply rounded-lg bg-brand-navy py-2 px-3 font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60;
}
.back {
  @apply rounded-lg border-2 border-brand-navy py-2 px-3 font-bold text-brand-navy transition hover:bg-gray-50;
}
.sending {
  @apply mt-3 text-gray-600;
}
.banner-success {
  @apply mt-3 rounded-lg border border-green-200 bg-green-100 p-2 text-green-800;
}
.banner-error {
  @apply mt-3 rounded-lg border border-red-200 bg-red-100 p-2 text-red-800;
}
.banner-error a {
  @apply font-bold underline;
}
@media (prefers-reduced-motion: reduce) {
  .progress span {
    @apply transition-none;
  }
}
</style>
