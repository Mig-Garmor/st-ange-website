<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import { useChat } from "@ai-sdk/vue";
import { DefaultChatTransport } from "ai";
import RequestCard from "./RequestCard.vue";
import { createTurnstile } from "./turnstile.js";
import { loadSession, saveSession, visitorId } from "./storage.js";
import { okCard } from "./card.js";
import { chatState, hasUnsentFirstMessage, isVerified, lastReplyMissing, localExchange, textOf } from "./messages.js";

const props = defineProps({
  settings: { type: Object, required: true },
  open: { type: Boolean, default: false },
});
const emit = defineEmits(["close", "ready"]);

const MAX_CHARS = 500;
const STATES = ["offline", "limit", "error"];

const field = ref(null);
const log = ref(null);
const challenge = ref(null);
const draft = ref("");
const verifyFailed = ref(false);
let turnstile = null;

const saved = loadSession();
const conversation = shallowRef({ id: saved?.id ?? crypto.randomUUID(), messages: saved?.messages ?? [] });

const transport = new DefaultChatTransport({
  api: "/api/chat",
  body: async () => ({
    visitorId: visitorId(),
    pageUrl: location.href,
    turnstileToken: isVerified(messages.value) ? undefined : await turnstile.token(),
  }),
});

const { id, messages, status, error, sendMessage, regenerate, clearError } = useChat(() => ({
  id: conversation.value.id,
  messages: conversation.value.messages,
  transport,
}));

const busy = computed(() => status.value === "submitted" || status.value === "streaming");
const unavailable = computed(() => `Chat is unavailable right now. Call us at ${props.settings.phoneDisplay}.`);
const failed = computed(() => status.value === "error" && !verifyFailed.value);
const noReply = computed(() => status.value === "ready" && !verifyFailed.value && lastReplyMissing(messages.value));

watch([id, messages, status], () => {
  if (status.value !== "streaming") saveSession({ id: id.value, messages: messages.value });
});

watch(error, async (err) => {
  const challengeFailed = err && !err.statusCode && err.message?.startsWith("Turnstile");
  if (err?.statusCode !== 403 && !challengeFailed) {
    verifyFailed.value = false;
    return;
  }
  const history = messages.value.slice(0, -1);
  if (!isVerified(history)) {
    verifyFailed.value = true;
    return;
  }
  const text = textOf(messages.value.at(-1) ?? {});
  conversation.value = { id: crypto.randomUUID(), messages: [] };
  await nextTick();
  if (text) send(text);
});

const awayFromBottom = ref(false);

function onLogScroll() {
  const el = log.value;
  if (el) awayFromBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight > 80;
}

async function scrollToBottom(behavior = "auto") {
  await nextTick();
  const el = log.value;
  if (!el) return;
  el.scrollTo({ top: el.scrollHeight, behavior });
  awayFromBottom.value = false;
}

watch(
  () => [messages.value.length, messages.value.at(-1)],
  () => scrollToBottom(),
);

function send(text) {
  const value = text.trim().slice(0, MAX_CHARS);
  if (!value || busy.value) return;
  if (verifyFailed.value) return retry();
  if (status.value === "error") clearError();
  sendMessage({ text: value });
}

function ask(reply) {
  const answer = props.settings.localAnswers?.[reply];
  if (!answer) return send(reply);
  if (busy.value) return;
  messages.value = [...messages.value, ...localExchange(reply, answer)];
}

function submit() {
  if (busy.value || !draft.value.trim()) return;
  send(draft.value);
  draft.value = "";
}

function retry() {
  verifyFailed.value = false;
  clearError();
  regenerate();
}

function focusInput() {
  nextTick(() => field.value?.focus());
}

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    scrollToBottom();
    focusInput();
  },
);

onMounted(() => {
  turnstile = createTurnstile(challenge.value, props.settings.turnstileSiteKey);
  if (!isVerified(messages.value)) turnstile.warm();
  if (hasUnsentFirstMessage(messages.value)) verifyFailed.value = true;
  emit("ready");
  if (props.open) {
    scrollToBottom();
    focusInput();
  }
});

onBeforeUnmount(() => turnstile?.remove());
</script>

<template>
  <section
    class="chat-panel"
    role="dialog"
    aria-modal="false"
    aria-labelledby="chat-panel-title"
    @keydown.esc.stop="emit('close')"
  >
    <header class="head">
      <h2 id="chat-panel-title" class="head-title">Chat with us</h2>
      <button type="button" class="close" aria-label="Close chat" @click="emit('close')">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path
            fill="currentColor"
            d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41Z"
          />
        </svg>
      </button>
    </header>

    <div ref="log" class="log" aria-live="polite" @scroll.passive="onLogScroll">
      <p class="bubble from-shop">{{ settings.greeting }}</p>
      <p class="notice">
        {{ settings.notice }}
        <a :href="settings.privacyPath">Privacy</a>
      </p>

      <div v-if="!messages.length" class="quick-replies">
        <button v-for="reply in settings.quickReplies" :key="reply" type="button" @click="ask(reply)">
          {{ reply }}
        </button>
      </div>

      <template v-for="message in messages" :key="message.id">
        <div v-if="STATES.includes(chatState(message))" class="state-view" role="status">
          <p>{{ textOf(message) || unavailable }}</p>
          <div class="state-links">
            <a :href="settings.phoneHref" class="call">Call {{ settings.phoneDisplay }}</a>
            <a href="/contact-us" class="quote">Request a quote</a>
          </div>
        </div>
        <template v-else>
          <template v-for="(part, index) in message.parts" :key="`${message.id}-${index}`">
            <p
              v-if="part.type === 'text' && part.text"
              class="bubble"
              :class="message.role === 'user' ? 'from-visitor' : 'from-shop'"
            >
              {{ part.text }}
            </p>
            <RequestCard
              v-else-if="okCard(part)"
              :proposal="part"
              :conversation-id="id"
              :services="settings.services"
              :phone-display="settings.phoneDisplay"
              :phone-href="settings.phoneHref"
            />
          </template>
        </template>
      </template>

      <p v-if="status === 'submitted'" class="typing" role="status" aria-label="Typing">
        <span></span><span></span><span></span>
      </p>

      <div v-if="verifyFailed" class="state-view" role="alert">
        <p>We couldn't start the chat. Please try again.</p>
        <div class="state-links">
          <button type="button" class="call" @click="retry">Try again</button>
          <a :href="settings.phoneHref" class="quote">Call {{ settings.phoneDisplay }}</a>
        </div>
      </div>
      <div v-else-if="noReply" class="state-view" role="status">
        <p>Sorry, that didn't come through.</p>
        <div class="state-links">
          <button type="button" class="call" @click="retry">Try again</button>
          <a :href="settings.phoneHref" class="quote">Call {{ settings.phoneDisplay }}</a>
        </div>
      </div>
      <div v-else-if="failed" class="state-view" role="alert">
        <p>{{ unavailable }}</p>
        <div class="state-links">
          <a :href="settings.phoneHref" class="call">Call {{ settings.phoneDisplay }}</a>
          <a href="/contact-us" class="quote">Request a quote</a>
        </div>
      </div>
    </div>

    <button
      v-if="awayFromBottom"
      type="button"
      class="to-bottom"
      aria-label="Jump to the latest message"
      @click="scrollToBottom('smooth')"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path fill="currentColor" d="M12 16.6 5.4 10l1.4-1.4 5.2 5.2 5.2-5.2 1.4 1.4z" />
      </svg>
    </button>

    <div ref="challenge" class="challenge"></div>

    <form v-if="!verifyFailed" class="composer" @submit.prevent="submit">
      <input
        ref="field"
        aria-label="Your message"
        v-model="draft"
        type="text"
        :maxlength="MAX_CHARS"
        autocomplete="off"
        placeholder="Type your message"
      />
      <button type="submit" class="send" :disabled="busy || !draft.trim()">Send</button>
    </form>
  </section>
</template>

<style scoped>
.chat-panel {
  @apply fixed inset-x-2 top-2 z-[1000] flex flex-col overflow-hidden rounded-lg border-2 border-brand-navy bg-white shadow-[0_8px_24px_rgba(0,0,0,0.25)];
  bottom: calc(3.5rem + env(safe-area-inset-bottom, 0px) + 0.5rem);
}
@media (min-width: 768px) {
  .chat-panel {
    @apply inset-x-auto top-auto right-4 bottom-4 w-[22rem];
    height: min(36rem, calc(100vh - 2rem));
  }
}
.head {
  @apply flex items-center justify-between bg-brand-navy px-4 py-3 text-white;
}
.head-title {
  @apply text-[16px] font-bold;
}
.close {
  @apply rounded-full p-1 text-white hover:text-brand-yellow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow;
}
.log {
  @apply flex flex-1 flex-col gap-2 overflow-y-auto overscroll-contain bg-gray-50 p-3;
}
.to-bottom {
  @apply absolute bottom-[4.5rem] right-4 grid h-9 w-9 place-items-center rounded-full bg-brand-navy text-white shadow-md hover:bg-brand-yellow hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow;
}
.bubble {
  @apply max-w-[85%] whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-[15px];
}
.from-shop {
  @apply self-start border border-gray-200 bg-white text-gray-900;
}
.from-visitor {
  @apply self-end bg-brand-navy text-white;
}
.notice {
  @apply text-xs text-gray-600;
}
.notice a {
  @apply font-semibold text-brand-navy underline;
}
.quick-replies {
  @apply flex flex-wrap gap-2;
}
.quick-replies button {
  @apply rounded-full border-2 border-brand-navy bg-white px-3 py-1 text-sm font-semibold text-brand-navy transition hover:bg-brand-yellow;
}
.state-view {
  @apply rounded-lg border border-gray-200 bg-white p-3 text-[15px];
}
.state-links {
  @apply mt-2 grid grid-cols-2 gap-2;
}
.state-links a,
.state-links button {
  @apply flex items-center justify-center rounded-lg py-2 px-2 text-center text-sm font-bold;
}
.state-links .call {
  @apply bg-brand-yellow text-brand-navy;
}
.state-links .quote {
  @apply bg-brand-navy text-white;
}
.typing {
  @apply flex gap-1 self-start rounded-lg border border-gray-200 bg-white px-3 py-3;
}
.typing span {
  @apply h-2 w-2 animate-pulse rounded-full bg-gray-400;
}
.typing span:nth-child(2) {
  animation-delay: 0.2s;
}
.typing span:nth-child(3) {
  animation-delay: 0.4s;
}
.challenge:empty {
  @apply hidden;
}
.composer {
  @apply flex gap-2 border-t border-gray-200 bg-white p-2;
}
.composer input {
  @apply min-w-0 flex-1 rounded-lg border border-gray-300 p-2 text-[16px] focus:outline-none focus:ring-2 focus:ring-blue-400;
}
.send {
  @apply rounded-lg bg-brand-navy px-4 font-bold text-white transition hover:opacity-90 disabled:opacity-60;
}
</style>
