const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// Cloudflare's test keys report example.com as the hostname, so the allowlist is opt-in.
export function createTurnstile({ secret, hostnames = [], fetch = globalThis.fetch }) {
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
        return data?.success === true && (!hostnames.length || hostnames.includes(data.hostname));
      } catch {
        return false;
      }
    },
  };
}
