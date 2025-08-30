// src/composables/useScrollDirection.js
import { ref, onMounted, onBeforeUnmount } from "vue";

export function useScrollDirection() {
  const isScrollingUp = ref(true); // true if user is scrolling up
  const isAtTop = ref(true); // true if at the top of the page
  let lastScroll = 0;

  const handleScroll = () => {
    const currentScroll =
      window.pageYOffset || document.documentElement.scrollTop;

    // Update scroll direction
    if (currentScroll < lastScroll && currentScroll > 50) {
      isScrollingUp.value = true;
    } else if (currentScroll > lastScroll) {
      isScrollingUp.value = false;
    }

    // Update if we're at the top
    isAtTop.value = currentScroll <= 0;

    lastScroll = currentScroll <= 0 ? 0 : currentScroll;
  };

  onMounted(() => {
    window.addEventListener("scroll", handleScroll);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("scroll", handleScroll);
  });

  return {
    isScrollingUp,
    isAtTop,
  };
}
