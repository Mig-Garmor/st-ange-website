import { createTurnstile } from "../../chat/widget/turnstile.js";

const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? "";

// Without a site key the server has no secret either, so the form posts without a token.
export function useFormTurnstile(container) {
  let turnstile = null;
  return {
    async token() {
      if (!siteKey) return undefined;
      turnstile ??= createTurnstile(container.value, siteKey);
      return turnstile.token();
    },
    remove: () => turnstile?.remove(),
  };
}
