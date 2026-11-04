const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const TIMEOUT_MS = 30_000;
// Turnstile tokens are valid for 300 seconds; leave a margin for the request.
const MAX_AGE_MS = 240_000;

let scriptPromise = null;

function loadScript() {
  scriptPromise ??= new Promise((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile);
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile missing")));
    script.onerror = () => {
      script.remove();
      scriptPromise = null;
      reject(new Error("Turnstile failed to load"));
    };
    document.head.append(script);
  });
  return scriptPromise;
}

export function createTurnstile(container, siteKey) {
  let widgetId = null;
  let pending = null;
  let next = null;
  let used = false;

  const settle = (method, value) => {
    const current = pending;
    pending = null;
    if (!current) return;
    clearTimeout(current.timer);
    current[method](value);
  };

  let ready = null;
  const ensure = () =>
    (ready ??= loadScript().then((turnstile) => {
      widgetId = turnstile.render(container, {
        sitekey: siteKey,
        execution: "execute",
        appearance: "interaction-only",
        callback: (token) => settle("resolve", token),
        "error-callback": () => settle("reject", new Error("Turnstile challenge failed")),
        "timeout-callback": () => settle("reject", new Error("Turnstile challenge timed out")),
      });
      return turnstile;
    }, (error) => {
      ready = null;
      throw error;
    }));

  async function run() {
    const turnstile = await ensure();
    while (pending) await pending.promise.catch(() => {});
    const promise = new Promise((resolve, reject) => {
      pending = { resolve, reject, timer: setTimeout(() => settle("reject", new Error("Turnstile timed out")), TIMEOUT_MS) };
    });
    pending.promise = promise;
    if (used) turnstile.reset(widgetId);
    used = true;
    turnstile.execute(widgetId);
    return promise;
  }

  function request() {
    const slot = { at: 0 };
    slot.promise = run().then((token) => {
      slot.at = Date.now();
      return token;
    });
    slot.promise.catch(() => {});
    return slot;
  }

  return {
    warm() {
      next ??= Object.assign(request(), { warmed: true });
    },
    async token() {
      const slot = next ?? request();
      next = null;
      try {
        const token = await slot.promise;
        if (Date.now() - slot.at < MAX_AGE_MS) return token;
      } catch {
        if (!slot.warmed) throw new Error("Turnstile unavailable");
      }
      return request().promise;
    },
    remove() {
      settle("reject", new Error("Turnstile removed"));
      if (widgetId !== null) window.turnstile?.remove(widgetId);
    },
  };
}
