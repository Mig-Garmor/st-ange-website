<script setup>
import { Icon } from "@iconify/vue";

const props = defineProps({
  isMobile: {
    type: Boolean,
    default: false,
  },
  isMobileMenuOpen: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["close-mobile-menu"]);

const closeMobileMenu = () => {
  emit("close-mobile-menu");
};
</script>

<template>
  <div
    v-if="isMobile && isMobileMenuOpen"
    class="mobile-menu-overlay-component animate-fadeIn"
  >
    <div class="mobile-menu-content">
      <div class="mobile-menu-header">
        <Icon
          icon="mdi:close"
          width="30"
          height="30"
          color="#011F7C"
          @click="closeMobileMenu"
          class="close-icon"
        />
      </div>

      <div class="mobile-menu-body">
        <div class="mobile-menu-item" @click="closeMobileMenu">Home</div>
        <div class="mobile-menu-item" @click="closeMobileMenu">About</div>

        <!-- You can also include the contact info in the mobile menu if desired -->
        <div class="mobile-contact-info">
          <div class="mobile-phone">
            <Icon
              icon="mdi:phone"
              width="20"
              height="20"
              color="#011F7C"
            />832-572-7121
          </div>
          <div class="mobile-location">
            <Icon icon="mdi:location" width="20" height="20" color="#011F7C" />
            1300 N Main St, Baytown
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style src="@styles/components/modals/mobile-menu-overlay.css"></style>
