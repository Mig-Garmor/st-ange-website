import { ref, onMounted, onUnmounted, computed } from "vue";

export function useDeviceType(options = {}) {
  const { mobileBreakpoint = 768, tabletBreakpoint = 1024 } = options;

  const windowWidth = ref(0);

  const updateWindowWidth = () => {
    if (typeof window !== "undefined") {
      windowWidth.value = window.innerWidth;
    }
  };

  onMounted(() => {
    updateWindowWidth();
    if (typeof window !== "undefined") {
      window.addEventListener("resize", updateWindowWidth);
    }
  });

  onUnmounted(() => {
    if (typeof window !== "undefined") {
      window.removeEventListener("resize", updateWindowWidth);
    }
  });

  const isMobile = computed(() => windowWidth.value < mobileBreakpoint);

  return {
    isMobile,
  };
}
