<script setup>
import { Icon } from "@iconify/vue";

import IconText from "@components/utilities/IconText.vue";
import { business, shortAddress } from "@/config/business";
import { navLinks } from "@/config/navigation";

defineProps({
  open: { type: Boolean, default: false },
});

const emit = defineEmits(["close"]);
const close = () => emit("close");
</script>

<template>
  <div
    v-if="open"
    class="mobile-menu-overlay-component"
    role="dialog"
    aria-modal="true"
    aria-label="Menu"
  >
    <div class="mobile-menu-header">
      <button type="button" aria-label="Close menu" @click="close">
        <Icon icon="mdi:close" width="30" height="30" class="close-icon" />
      </button>
    </div>

    <RouterLink to="/" class="mobile-menu-logo" @click="close">
      <img src="/assets/logo-2.webp" :alt="`${business.name} logo`" />
    </RouterLink>

    <nav class="mobile-menu-body" aria-label="Mobile">
      <RouterLink
        v-for="link in navLinks"
        :key="link.to"
        :to="link.to"
        class="mobile-menu-item"
        @click="close"
      >
        {{ link.label }}
      </RouterLink>

      <div class="mobile-contact-info">
        <IconText
          icon="mdi:phone"
          :text="business.phone.display"
          :href="business.phone.href"
          :icon-size="20"
        />
        <IconText
          icon="mdi:location"
          :text="shortAddress"
          :href="business.links.maps"
          external
          :icon-size="20"
        />
      </div>
    </nav>
  </div>
</template>

<style src="@styles/components/modals/mobile-menu-overlay.css"></style>
