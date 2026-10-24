<script setup>
import { ref } from "vue";

import { relocation, showRelocationNotice } from "@/config/business";
import { relocationNotice } from "@/content/relocation";

// Four copies keep the loop seamless up to ~2700px wide; only the first is exposed to assistive tech.
const COPIES = 4;
const isPaused = ref(false);

// One cycle scrolls two copies; ~7.4px per character at 15px plus 88px of padding, at ~40px/s.
const textLength = `${relocationNotice.lead} ${relocationNotice.parts.map((part) => part.text).join("")}`.length;
const duration = `${Math.round(((textLength * 7.4 + 88) * 2) / 40)}s`;
</script>

<template>
  <aside
    v-if="showRelocationNotice"
    class="relocation-notice"
    :class="{ 'is-paused': isPaused }"
    aria-label="Shop relocation"
  >
    <a
      :href="relocation.next.maps"
      target="_blank"
      rel="noopener"
      class="notice-tag"
      :aria-label="`New location, ${relocation.next.street}, opens Google Maps in a new tab`"
    >
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <path
          d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"
          fill="currentColor"
        />
      </svg>
      New location
    </a>

    <div class="ticker">
      <div class="ticker-track" :style="{ animationDuration: duration }">
        <p
          v-for="copy in COPIES"
          :key="copy"
          class="ticker-item"
          :aria-hidden="copy > 1 ? 'true' : undefined"
        >
          <strong>{{ relocationNotice.lead }}</strong>&#32;<template v-for="part in relocationNotice.parts" :key="part.text"><mark v-if="part.key">{{ part.text }}</mark><template v-else>{{ part.text }}</template></template>
        </p>
      </div>
    </div>

    <button
      type="button"
      class="ticker-toggle"
      :aria-label="isPaused ? 'Play announcement' : 'Pause announcement'"
      @click="isPaused = !isPaused"
    >
      <svg v-if="isPaused" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <path d="M8 5v14l11-7z" fill="currentColor" />
      </svg>
      <svg v-else viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <path d="M6 5h4v14H6zm8 0h4v14h-4z" fill="currentColor" />
      </svg>
    </button>
  </aside>
</template>

<style src="@styles/components/wrappers/relocation-notice.css"></style>
