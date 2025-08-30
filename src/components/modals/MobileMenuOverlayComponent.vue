<script setup>
import { Icon } from "@iconify/vue";

defineProps({
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
  console.log("closeMobileMenu");
  emit("close-mobile-menu");
};
</script>

<template>
  <!-- Mobile Menu Overlay -->
  <div v-if="isMobile && isMobileMenuOpen" class="mobile-menu-overlay">
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

<style scoped>
.hamburger-icon {
  cursor: pointer;
  transition: transform 0.2s ease;
}

.hamburger-icon:hover {
  transform: scale(1.1);
}

.mobile-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(5px);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  animation: fadeIn 0.3s ease;
}

.mobile-menu-content {
  width: 100%;
  height: 100%;
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.mobile-menu-header {
  display: flex;
  justify-content: flex-end;
  padding: 10px 0 30px 0;
}

.close-icon {
  cursor: pointer;
  transition: transform 0.2s ease;
}

.close-icon:hover {
  transform: scale(1.2);
}

.mobile-menu-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 40px;
}

.mobile-menu-item {
  font-size: 24px;
  font-weight: 600;
  color: #011f7c;
  cursor: pointer;
  padding: 15px 30px;
  border-radius: 8px;
  transition: all 0.3s ease;
  text-align: center;
  min-width: 150px;
}

.mobile-menu-item:hover {
  background-color: #f0f7ff;
  transform: scale(1.05);
}

.mobile-contact-info {
  margin-top: 50px;
  display: flex;
  flex-direction: column;
  gap: 15px;
  align-items: center;
}

.mobile-phone,
.mobile-location {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  color: #011f7c;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Prevent body scroll when menu is open */
.mobile-menu-overlay {
  overflow: hidden;
}
</style>
