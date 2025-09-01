<script setup>
import { ref, watch } from "vue";
import { useScrollDirection } from "@composables/useScrollDirection";

import { Icon } from "@iconify/vue";
import logo from "@assets/logo-2.webp";

import { useDeviceType } from "@composables/useDeviceType";
import MobileMenuOverlayComponent from "../modals/MobileMenuOverlayComponent.vue";

defineProps({
  isSticky: {
    type: Boolean,
    default: false,
  },
});

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
</script>

<template>
  <div
    :class="[
      isSticky && 'header-sticky-container',
      { hidden: !isScrollingUp, isAtTop: isAtTop },
    ]"
    class="header-container"
  >
    <div class="logo-container" :class="isMobile && 'max-w-[200px]'">
      <img :src="logo" />
      <div class="information-container">
        <div class="phone-number">
          <Icon
            class="icon"
            icon="mdi:phone"
            :width="isMobile ? '15' : '24'"
            :height="24"
            color="#011F7C"
          />832-572-7121
        </div>
        <div class="location">
          <Icon
            class="icon"
            icon="mdi:location"
            :width="isMobile ? '15' : '24'"
            height="24"
            color="#011F7C"
          />1300 N Main St, Baytown
        </div>
      </div>
    </div>
    <div v-if="!isMobile" class="information-container">
      <div class="phone-number">
        <Icon
          class="icon"
          icon="mdi:phone"
          width="24"
          height="24"
          color="#011F7C"
        />832-572-7121
      </div>
      <div class="location">
        <Icon
          class="icon"
          icon="mdi:location"
          width="24"
          height="24"
          color="#011F7C"
        />1300 N Main St, Baytown
      </div>
    </div>
    <div v-if="!isMobile" class="links-container">
      <div>Home</div>
      <div>About</div>
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
