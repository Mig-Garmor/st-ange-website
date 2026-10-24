// src/composables/useScrollDirection.js
import { ref, onMounted, onBeforeUnmount } from "vue";

export function useScrollDirection() {
  const scrollY = ref(0);
  const isScrollingUp = ref(true);

  const readScroll = () =>
    Math.max(0, window.pageYOffset || document.documentElement.scrollTop);

  const handleScroll = () => {
    const currentScroll = readScroll();

    if (currentScroll < scrollY.value) {
      isScrollingUp.value = true;
    } else if (currentScroll > scrollY.value) {
      isScrollingUp.value = false;
    }

    scrollY.value = currentScroll;
  };

  onMounted(() => {
    scrollY.value = readScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
  });

  onBeforeUnmount(() => {
    window.removeEventListener("scroll", handleScroll);
  });

  return {
    scrollY,
    isScrollingUp,
  };
}
