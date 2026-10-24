<script setup>
import { ref, watch } from "vue";
import { Icon } from "@iconify/vue";

import MobileMenuOverlayComponent from "@components/modals/MobileMenuOverlayComponent.vue";
import IconText from "@components/utilities/IconText.vue";
import { useScrollDirection } from "@composables/useScrollDirection";
import { business, shortAddress } from "@/config/business";
import { navLinks } from "@/config/navigation";

const { isScrollingUp, isAtTop } = useScrollDirection();
const isMobileMenuOpen = ref(false);

watch(isMobileMenuOpen, (isOpen) => {
  document.body.style.overflow = isOpen ? "hidden" : "";
});
</script>

<template>
  <header
    class="site-header"
    :class="{ 'is-hidden': !isScrollingUp && !isAtTop }"
  >
    <div class="header-brand">
      <RouterLink to="/" class="logo" :aria-label="`${business.name} home`">
        <img
          src="/assets/logo-2.webp"
          :alt="`${business.name} logo`"
          width="983"
          height="254"
        />
      </RouterLink>

      <div class="contact-info contact-info--mobile">
        <IconText
          icon="mdi:phone"
          :text="business.phone.display"
          :href="business.phone.href"
          :icon-size="15"
        />
        <IconText
          icon="mdi:location"
          :text="shortAddress"
          :href="business.links.maps"
          external
          :icon-size="15"
        />
      </div>
    </div>

    <div class="contact-info contact-info--desktop">
      <IconText
        icon="mdi:phone"
        :text="business.phone.display"
        :href="business.phone.href"
      />
      <IconText
        icon="mdi:location"
        :text="shortAddress"
        :href="business.links.maps"
        external
      />
    </div>

    <nav class="nav-links" aria-label="Main">
      <RouterLink v-for="link in navLinks" :key="link.to" :to="link.to">
        {{ link.label }}
      </RouterLink>
    </nav>

    <button
      type="button"
      class="menu-button"
      aria-label="Open menu"
      @click="isMobileMenuOpen = true"
    >
      <Icon icon="game-icons:hamburger-menu" width="35" height="35" />
    </button>
  </header>

  <MobileMenuOverlayComponent
    :open="isMobileMenuOpen"
    @close="isMobileMenuOpen = false"
  />
</template>

<style src="@styles/components/wrappers/page-header.css"></style>
