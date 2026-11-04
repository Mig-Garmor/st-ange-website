<script setup>
import { defineAsyncComponent, nextTick, ref, shallowRef } from "vue";

defineProps({
  settings: { type: Object, required: true },
});

const open = ref(false);
const ready = ref(false);
const bubble = ref(null);
const panel = shallowRef(null);

function toggle() {
  panel.value ??= defineAsyncComponent(() => import("./ChatPanel.vue"));
  open.value = !open.value;
}

async function close() {
  open.value = false;
  await nextTick();
  bubble.value?.focus();
}
</script>

<template>
  <div v-if="settings.enabled" class="chat-root">
    <component
      :is="panel"
      v-if="panel"
      v-show="open"
      id="chat-panel"
      :settings="settings"
      :open="open"
      @ready="ready = true"
      @close="close"
    />
    <button
      ref="bubble"
      type="button"
      class="chat-bubble"
      :class="{ 'is-hidden': open && ready }"
      :aria-label="open ? 'Close chat' : 'Chat with us'"
      :aria-expanded="open"
      :aria-controls="panel ? 'chat-panel' : undefined"
      :aria-busy="open && !ready"
      @click="toggle"
    >
      <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
        <path
          fill="currentColor"
          d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2ZM6 9h12v2H6V9Zm8 5H6v-2h8v2Zm4-6H6V6h12v2Z"
        />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.chat-bubble {
  @apply fixed right-4 z-[999] flex h-14 w-14 items-center justify-center rounded-full;
  @apply bg-brand-navy text-brand-yellow border-2 border-brand-yellow shadow-[0_4px_12px_rgba(0,0,0,0.25)];
  @apply transition-transform duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-yellow/60;
  bottom: calc(3.5rem + env(safe-area-inset-bottom, 0px) + 0.75rem);
}
.chat-bubble.is-hidden {
  @apply hidden;
}
@media (min-width: 768px) {
  .chat-bubble {
    @apply bottom-4;
  }
}
</style>
