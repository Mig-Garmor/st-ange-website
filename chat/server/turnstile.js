const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function createTurnstile({ secret, fetch = globalThis.fetch }) {
  return {
    async verify(token, ip) {
      if (!token) return false;
      try {
        const res = await fetch(VERIFY_URL, {
          method: "POST",
          body: new URLSearchParams({ secret, response: token, remoteip: ip ?? "" }),
        });
        if (!res.ok) return false;
        const data = await res.json();
        return data?.success === true;
      } catch {
        return false;
      }
    },
  };
}
