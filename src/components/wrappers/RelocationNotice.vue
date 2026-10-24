<script setup>
import { ref } from "vue";

import { relocation, showRelocationNotice } from "@/config/business";
import { relocationNotice } from "@/content/relocation";

// Four copies keep the loop seamless up to ~2700px wide; only the first is exposed to assistive tech.
const COPIES = 4;
const isPaused = ref(false);
</script>

<template>
  <aside
    v-if="showRelocationNotice"
    class="relocation-notice"
    :class="{ 'is-paused': isPaused }"
    aria-label="Shop relocation"
  >
    <span class="notice-tag">{{ relocationNotice.tag }}</span>

    <div class="ticker">
      <div class="ticker-track">
        <p
          v-for="copy in COPIES"
          :key="copy"
          class="ticker-item"
          :aria-hidden="copy > 1 ? 'true' : undefined"
        >
          <strong>{{ relocationNotice.lead }}</strong>
          {{ relocationNotice.text }}
          <a
            :href="relocation.next.maps"
            target="_blank"
            rel="noopener"
            :tabindex="copy > 1 ? -1 : undefined"
          >Get directions</a>
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
