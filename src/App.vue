<script setup>
import { useHead } from "@unhead/vue";
import { localBusinessSchema } from "@/seo/localBusinessSchema";

useHead({
  htmlAttrs: { lang: "en" },
  script: [
    {
      type: "application/ld+json",
      key: "local-business",
      innerHTML: JSON.stringify(localBusinessSchema()),
    },
  ],
});
</script>

<template>
  <router-view />
</template>
