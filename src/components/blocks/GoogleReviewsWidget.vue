<script setup>
import { onMounted, onBeforeUnmount, ref } from "vue";

const WIDGET_ID = "featurable-41509530-5f33-499e-85c5-72c7e376bfc7";
const SCRIPT_SRC = "https://featurable.com/assets/bundle.js";

const container = ref(null);

// Featurable only scans the page when its bundle loads, so it is re-injected on every visit to this page.
function loadScript() {
  document.querySelector(`script[src^="${SCRIPT_SRC}"]`)?.remove();
  const script = document.createElement("script");
  script.src = `${SCRIPT_SRC}?reload=${Date.now()}`;
  script.defer = true;
  script.charset = "UTF-8";
  document.body.appendChild(script);
}

onMounted(() => {
  container.value.innerHTML = `<div id="${WIDGET_ID}" data-featurable-async></div>`;
  loadScript();
});

onBeforeUnmount(() => {
  if (container.value) container.value.innerHTML = "";
});
</script>

<template>
  <div ref="container" class="google-reviews-widget" title="Google reviews carousel"></div>
</template>

<style scoped>
.google-reviews-widget {
  @apply flex max-w-full justify-center items-center overflow-hidden;
}
</style>
