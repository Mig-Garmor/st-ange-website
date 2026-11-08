import { computed, onBeforeUnmount, reactive, ref, watch } from "vue";

import { submitForm } from "@api/forms";
import { useFormTurnstile } from "@modules/formTurnstile.js";
import { business } from "@/config/business";

// The state and send flow both website forms share; each form keeps its own fields and checks.
export function useLeadForm(emptyForm, challenge) {
  const form = reactive(emptyForm());
  const errors = reactive(emptyForm());
  const status = ref(""); // "" | "sending" | "success" | "error"
  const sentEmail = ref(""); // shown back after sending, so a mistyped address can be spotted
  const hasErrors = computed(() => Object.values(errors).some(Boolean));

  const turnstile = useFormTurnstile(challenge);
  onBeforeUnmount(turnstile.remove);

  let idempotencyKey = null;
  watch(form, () => {
    idempotencyKey ??= crypto.randomUUID();
  });

  async function send(fields, { onFieldErrors }) {
    status.value = "sending";
    let turnstileToken;
    try {
      turnstileToken = await turnstile.token();
    } catch {
      status.value = "error";
      return;
    }
    status.value = await submitForm(
      "send-email",
      { turnstileToken, ...fields, consent: form.consent ? business.callbackConsent : "", pageUrl: location.href, idempotencyKey },
      { onFieldErrors },
    );
    if (status.value === "success") {
      sentEmail.value = fields.email ?? "";
      Object.assign(form, emptyForm());
      idempotencyKey = null;
    }
  }

  return { form, errors, status, hasErrors, sentEmail, send };
}
