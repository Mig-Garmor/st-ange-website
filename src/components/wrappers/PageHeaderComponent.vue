<script setup>
import { ref, watch } from "vue";
import { useRouter } from "vue-router";

import { Icon } from "@iconify/vue";

import MobileMenuOverlayComponent from "@components/modals/MobileMenuOverlayComponent.vue";
import IconText from "@components/utilities/IconText.vue";

import { useScrollDirection } from "@composables/useScrollDirection";
import { useDeviceType } from "@composables/useDeviceType";

defineProps({
  isSticky: {
    type: Boolean,
    default: false,
  },
});

const router = useRouter();

const { isScrollingUp, isAtTop } = useScrollDirection();
const { isMobile } = useDeviceType();

// Mobile menu state
const isMobileMenuOpen = ref(false);

const openMobileMenu = () => {
  isMobileMenuOpen.value = true;
};

const handleCloseMobileMenu = () => {
  isMobileMenuOpen.value = false;
};

// Stops scrolling when menu is open
watch(isMobileMenuOpen, (isOpen) => {
  if (isOpen) {
    document.body.style.overflow = "hidden";
  } else {
    document.body.style.overflow = "unset";
  }
});

const googleMapsBusinessLink = "https://maps.app.goo.gl/kRiqUGChingHzADh6";
</script>

<template>
  <div
    :class="[
      isSticky && 'header-sticky-container',
      { hidden: !isScrollingUp, isAtTop: isAtTop },
    ]"
    class="header-container"
  >
    <div
      class="logo-container"
      :class="[
        isMobile ? 'max-w-[200px]' : 'max-w-[300px]',
        link && 'cursor-pointer',
      ]"
      @click="router.push('/')"
    >
      <div class="logo"><img src="/assets/logo-2.webp" alt="logo" /></div>

      <div v-if="isMobile" class="information-container">
        <div class="phone-number">
          <IconText
            icon="mdi:phone"
            text="832-572-7121"
            :iconWidth="isMobile ? '15' : '24'"
            :iconHeight="isMobile ? '15' : '24'"
          />
        </div>
        <div class="location">
          <IconText
            icon="mdi:location"
            text="1300 N Main St, Baytown"
            :iconWidth="isMobile ? '15' : '24'"
            :iconHeight="isMobile ? '15' : '24'"
          />
        </div>
      </div>
    </div>
    <div v-if="!isMobile" class="information-container">
      <div class="phone-number">
        <IconText icon="mdi:phone" text="832-572-7121" />
      </div>
      <div class="location">
        <IconText
          icon="mdi:location"
          text="1300 N Main St, Baytown"
          :link="googleMapsBusinessLink"
        />
      </div>
    </div>
    <div v-if="!isMobile" class="links-container">
      <RouterLink to="/">Home</RouterLink>
      <RouterLink to="/contact-us">Contact</RouterLink>
      <RouterLink to="/about">About</RouterLink>
    </div>

    <Icon
      v-if="isMobile"
      icon="game-icons:hamburger-menu"
      width="35"
      height="35"
      @click="openMobileMenu"
    />
  </div>
  <MobileMenuOverlayComponent
    :isMobile="isMobile"
    :isMobileMenuOpen="isMobileMenuOpen"
    @close-mobile-menu="handleCloseMobileMenu"
  />
</template>

<style src="@styles/components/wrappers/page-header.css"></style>
