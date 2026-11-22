<script setup>
import { onMounted, ref } from "vue";

import { isNoticeActive, siteNotice } from "@/content/notice";

// Four copies keep the loop seamless up to ~2700px wide; only the first is exposed to assistive tech.
const COPIES = 4;
const isPaused = ref(false);
// Checked in the browser too, so the banner disappears after the date without waiting for a rebuild.
const isActive = ref(isNoticeActive());
onMounted(() => (isActive.value = isNoticeActive()));

// One cycle scrolls two copies; ~7.4px per character at 15px plus 88px of padding, at ~40px/s.
const textLength = `${siteNotice.lead} ${siteNotice.parts.map((part) => part.text).join("")}`.length;
const duration = `${Math.round(((textLength * 7.4 + 88) * 2) / 40)}s`;
</script>

<template>
  <aside
    v-if="isActive"
    class="site-notice"
    :class="{ 'is-paused': isPaused }"
    :aria-label="siteNotice.tag"
  >
    <span class="notice-emoji" aria-hidden="true">{{ siteNotice.emoji }}</span>
    <span class="notice-tag">{{ siteNotice.tag }}</span>

    <div class="ticker">
      <div class="ticker-track" :style="{ animationDuration: duration }">
        <p
          v-for="copy in COPIES"
          :key="copy"
          class="ticker-item"
          :aria-hidden="copy > 1 ? 'true' : undefined"
        >
          <span class="lead-emoji" aria-hidden="true">{{ siteNotice.leadEmoji }}</span>&#32;<strong>{{ siteNotice.lead }}</strong>&#32;<span class="lead-emoji" aria-hidden="true">{{ siteNotice.leadEmoji }}</span>&#32;<template v-for="part in siteNotice.parts" :key="part.text"><mark v-if="part.key">{{ part.text }}</mark><template v-else>{{ part.text }}</template></template>
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

<style src="@styles/components/wrappers/site-notice.css"></style>
