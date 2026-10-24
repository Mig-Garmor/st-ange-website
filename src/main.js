import { ViteSSG } from "vite-ssg";
import routes from "virtual:generated-pages";

import App from "./App.vue";
import "./style.css";

export const createApp = ViteSSG(App, {
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    if (to.hash) return { el: to.hash, behavior: "smooth" };
    return { top: 0 };
  },
});
