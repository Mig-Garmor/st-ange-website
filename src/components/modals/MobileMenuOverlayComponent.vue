<script setup>
import { useRouter } from "vue-router";

import { Icon } from "@iconify/vue";
import IconText from "@components/utilities/IconText.vue";

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

const router = useRouter();

const googleMapsBusinessLink = "https://maps.app.goo.gl/kRiqUGChingHzADh6";

const emit = defineEmits(["close-mobile-menu"]);

const closeMobileMenu = (route) => {
  emit("close-mobile-menu");
  router.push(route);
};

const clickLogo = () => {
  emit("close-mobile-menu");
  router.push("/");
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
      <img
        src="/assets/logo-2.webp"
        @click="clickLogo"
        class="cursor-pointer"
      />

      <div class="mobile-menu-body">
        <div class="mobile-menu-item" @click="closeMobileMenu('/')">Home</div>
        <div class="mobile-menu-item" @click="closeMobileMenu('/contact-us')">
          Contact
        </div>
        <div class="mobile-menu-item" @click="closeMobileMenu('/about')">
          About
        </div>

        <!-- You can also include the contact info in the mobile menu if desired -->
        <div class="mobile-contact-info">
          <div class="mobile-phone">
            <IconText
              icon="mdi:phone"
              text="832-572-7121"
              iconWidth="20"
              iconHeight="20"
            />
          </div>
          <div class="mobile-location">
            <IconText
              icon="mdi:location"
              text="1300 N Main St, Baytown"
              iconWidth="20"
              iconHeight="20"
              :link="googleMapsBusinessLink"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style src="@styles/components/modals/mobile-menu-overlay.css"></style>
