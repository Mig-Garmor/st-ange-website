<script setup>
import { useHead } from "@unhead/vue";
import { localBusinessSchema } from "@/seo/localBusinessSchema";

// Website Hub's tracker counts clicks on elements marked data-hub-tag (service cards). async: it never holds up the page.
const hubKey = import.meta.env.VITE_HUB_PK;
const hubUrl = __HUB_URL__;
const tracker = hubKey && hubUrl ? [{ key: "hub-tracker", src: `${hubUrl.replace(/\/+$/, "")}/t.js`, async: true, "data-key": hubKey }] : [];

useHead({
  htmlAttrs: { lang: "en" },
  script: [
    {
      type: "application/ld+json",
      key: "local-business",
      innerHTML: JSON.stringify(localBusinessSchema()),
    },
    ...tracker,
  ],
});
</script>

<template>
  <router-view />
</template>
