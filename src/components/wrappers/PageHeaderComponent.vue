<script setup>
import { computed, ref, watch } from "vue";
import { Icon } from "@iconify/vue";

import MobileMenuOverlayComponent from "@components/modals/MobileMenuOverlayComponent.vue";
import IconText from "@components/utilities/IconText.vue";
import { useScrollDirection } from "@composables/useScrollDirection";
import { business, shortAddress } from "@/config/business";
import { navLinks } from "@/config/navigation";

const SLIDE_MS = 300;

const headerEl = ref(null);
const { scrollY, isScrollingUp } = useScrollDirection();
const isPinned = ref(false);
const isSliding = ref(false);
let slideTimer;

const headerHeight = () => headerEl.value?.offsetHeight ?? 0;

const setPinned = (pinned) => {
  if (isPinned.value === pinned) return;
  isPinned.value = pinned;
  isSliding.value = true;
  clearTimeout(slideTimer);
  slideTimer = setTimeout(() => (isSliding.value = false), SLIDE_MS);
};

watch(scrollY, (y) => {
  if (y <= 0) {
    isPinned.value = false;
  } else if (!isScrollingUp.value) {
    setPinned(false);
  } else if (y > headerHeight()) {
    setPinned(true);
  }
});

// Unpinned, the header moves with the page until it has scrolled fully out of view.
const offset = computed(() =>
  isPinned.value ? 0 : Math.min(scrollY.value, headerHeight())
);

const isMobileMenuOpen = ref(false);

watch(isMobileMenuOpen, (isOpen) => {
  document.body.style.overflow = isOpen ? "hidden" : "";
});
</script>

<template>
  <header
    ref="headerEl"
    class="site-header"
    :class="{ 'is-sliding': isSliding }"
    :style="{ transform: `translateY(${-offset}px)` }"
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
