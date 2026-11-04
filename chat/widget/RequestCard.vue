<script setup>
import { computed, reactive, ref, useId, watch } from "vue";
import { fieldError, initialForm, okCard } from "./card.js";

const props = defineProps({
  proposal: { type: Object, required: true },
  conversationId: { type: String, required: true },
  services: { type: Array, default: () => [] },
  phoneDisplay: { type: String, required: true },
  phoneHref: { type: String, required: true },
  superseded: { type: Boolean, default: false },
  localAreaCodes: { type: Array, default: () => [] },
});

const form = reactive(initialForm(okCard(props.proposal)));
const errors = reactive({});

function check(field) {
  const message = fieldError(field, form[field], { localAreaCodes: props.localAreaCodes });
  if (message) errors[field] = message;
  else delete errors[field];
}
const editing = ref(false);
watch(
  () => props.superseded,
  (superseded) => {
    if (superseded) editing.value = false;
  },
);
const status = ref("");
const uid = useId();
// Derived from the tool call, so a reload re-sends with the same key and the shop is not emailed twice.
const idempotencyKey = `${props.conversationId}:${props.proposal.toolCallId}`;

const serviceName = computed(
  () => props.services.find((s) => s.slug === form.service)?.name ?? "Not sure yet",
);
const locked = computed(() => status.value === "sending" || status.value === "sent");
const invalid = computed(() => Object.keys(errors).length > 0);

async function send() {
  if (locked.value || props.superseded) return;
  for (const field of ["name", "phone", "email", "vehicle"]) check(field);
  if (invalid.value) {
    editing.value = true;
    return;
  }
  status.value = "sending";
  for (const key of Object.keys(errors)) delete errors[key];
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
      Object.assign(errors, result.errors);
      editing.value = true;
      status.value = "";
      return;
    }
    status.value = response.ok && result.status === "sent" ? "sent" : "failed";
  } catch {
    status.value = "failed";
  }
}
</script>

<template>
  <section class="request-card" :aria-labelledby="`${uid}-title`">
    <h3 :id="`${uid}-title`" class="title">Your request</h3>

    <form v-if="editing && !locked" class="fields" novalidate @submit.prevent="send">
      <label :for="`${uid}-service`">Service</label>
      <select :id="`${uid}-service`" v-model="form.service" @change="check('service')">
        <option value="">Not sure yet</option>
        <option v-for="service in services" :key="service.slug" :value="service.slug">{{ service.name }}</option>
      </select>
      <p v-if="errors.service" class="error">{{ errors.service }}</p>

      <label :for="`${uid}-name`">Name</label>
      <input :id="`${uid}-name`" v-model="form.name" @input="check('name')" autocomplete="name" :aria-invalid="!!errors.name" />
      <p v-if="errors.name" class="error">{{ errors.name }}</p>

      <label :for="`${uid}-phone`">Phone</label>
      <input :id="`${uid}-phone`" v-model="form.phone" @input="check('phone')" type="tel" autocomplete="tel" :aria-invalid="!!errors.phone" />
      <p v-if="errors.phone" class="error">{{ errors.phone }}</p>

      <label :for="`${uid}-email`">Email</label>
      <input :id="`${uid}-email`" v-model="form.email" @input="check('email')" type="email" autocomplete="email" :aria-invalid="!!errors.email" />
      <p v-if="errors.email" class="error">{{ errors.email }}</p>

      <label :for="`${uid}-vehicle`">Vehicle</label>
      <input :id="`${uid}-vehicle`" v-model="form.vehicle" @input="check('vehicle')" :aria-invalid="!!errors.vehicle" />
      <p v-if="errors.vehicle" class="error">{{ errors.vehicle }}</p>

      <label :for="`${uid}-notes`">Notes</label>
      <textarea :id="`${uid}-notes`" v-model="form.notes" @input="check('notes')" rows="3"></textarea>
      <p v-if="errors.notes" class="error">{{ errors.notes }}</p>
    </form>

    <dl v-else class="summary">
      <dt>Service</dt><dd>{{ serviceName }}</dd>
      <dt>Name</dt><dd>{{ form.name || "Not given" }}</dd>
      <dt>Phone</dt><dd>{{ form.phone || "Not given" }}</dd>
      <template v-if="form.email"><dt>Email</dt><dd>{{ form.email }}</dd></template>
      <dt>Vehicle</dt><dd>{{ form.vehicle || "Not given" }}</dd>
      <template v-if="form.notes"><dt>Notes</dt><dd>{{ form.notes }}</dd></template>
    </dl>

    <p v-if="status === 'sent'" class="banner-success" role="status">Sent. We'll call you back shortly.</p>
    <p v-else-if="status === 'failed'" class="banner-error" role="alert">
      We couldn't send your request. Please call us at
      <a :href="phoneHref">{{ phoneDisplay }}</a>.
    </p>

    <p v-if="superseded && status !== 'sent'" class="superseded">Replaced by the updated details below.</p>
    <div v-else-if="status !== 'sent'" class="actions">
      <button type="button" class="send" :disabled="locked" @click="send">
        {{ status === "sending" ? "Sending…" : "Send request" }}
      </button>
      <button type="button" class="edit" :disabled="locked || (editing && invalid)" @click="editing = !editing">
        {{ editing ? "Done" : "Edit" }}
      </button>
    </div>
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
  @apply mb-2 font-bold text-brand-navy;
}
.fields {
  @apply flex flex-col;
}
.fields label {
  @apply mt-2 mb-1 font-semibold;
}
.fields input,
.fields select,
.fields textarea {
  @apply rounded-lg border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-400;
}
.error {
  @apply mt-1 text-red-500 text-xs;
}
.summary {
  @apply grid grid-cols-[auto_1fr] gap-x-3 gap-y-1;
}
.summary dt {
  @apply font-semibold text-gray-600;
}
.summary dd {
  @apply break-words;
}
.actions {
  @apply mt-3 grid grid-cols-[2fr_1fr] gap-2;
}
.send {
  @apply rounded-lg bg-brand-navy py-2 px-3 font-bold text-white transition hover:opacity-90 disabled:opacity-60;
}
.edit {
  @apply rounded-lg border-2 border-brand-navy py-2 px-3 font-bold text-brand-navy transition hover:bg-gray-50 disabled:opacity-60;
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
</style>
