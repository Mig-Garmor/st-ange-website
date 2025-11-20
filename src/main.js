import { createApp } from "vue";
import "./style.css";
import router from "./router";

import App from "./App.vue";

if (!document.querySelector('meta[name="description"]')) {
  const meta = document.createElement("meta");
  meta.name = "description";
  meta.content =
    "St Ange Auto Service is a trusted auto repair shop in Baytown, Texas. We provide expert car alignment, A/C repair, brakes, tires, and more. Call 832-572-7121 for quality mechanic service today!";
  document.head.appendChild(meta);
}

createApp(App).use(router).mount("#app");
