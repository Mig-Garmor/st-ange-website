import { nextTick, onMounted, watch } from "vue";
import { useRoute } from "vue-router";

// Router navigation uses pushState, which doesn't update CSS :target, so the highlight is applied by hand.
export function useHashHighlight(className = "is-highlighted") {
  const route = useRoute();

  async function highlight(hash) {
    if (!hash) return;
    await nextTick();
    const element = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (!element) return;
    element.classList.remove(className);
    void element.offsetWidth; // forces a reflow so the animation restarts when the same link is clicked again
    element.classList.add(className);
    element.addEventListener("animationend", () => element.classList.remove(className), { once: true });
  }

  onMounted(() => highlight(route.hash));
  watch(() => route.hash, highlight);
}
