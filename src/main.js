import { ViteSSG } from "vite-ssg";
import routes from "virtual:generated-pages";

import App from "./App.vue";
import "./style.css";

// The target page may still be loading when the router scrolls, so wait for the element (up to ~1s).
function waitForElement(selector, attempts = 20) {
  return new Promise((resolve) => {
    const check = (left) => {
      if (document.querySelector(selector) || left === 0) return resolve();
      setTimeout(() => check(left - 1), 50);
    };
    check(attempts);
  });
}

export const createApp = ViteSSG(App, {
  routes,
  async scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    if (to.hash) {
      await waitForElement(to.hash);
      // The offset keeps the target clear of the sticky header and move banner.
      // An instant jump so the target's highlight hasn't started fading by the time it's on screen.
      return { el: to.hash, top: 160 };
    }
    return { top: 0 };
  },
});
