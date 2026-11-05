<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import { useChat } from "@ai-sdk/vue";
import { DefaultChatTransport } from "ai";
import RequestCard from "./RequestCard.vue";
import { createTurnstile } from "./turnstile.js";
import { forgetChat, isExpired, loadSession, recentChatId, rememberChat, saveSession, visitorId } from "./storage.js";
import { clearDraft, latestCardId as findLatestCardId, loadDraft, okCard, saveDraft } from "./card.js";
import { SENT_CLOSED, blocksChat, chatReason, chatState, displayParts, hasUnsentFirstMessage, isVerified, lastReplyMissing, localExchange, localForm, nextBurst, sentNote, textOf } from "./messages.js";

const props = defineProps({
  settings: { type: Object, required: true },
  open: { type: Boolean, default: false },
});
const emit = defineEmits(["close", "ready"]);

const MAX_CHARS = 500;
const STATES = ["offline", "limit", "error"];
const SHAKE_MS = 400;
// People often send a thought in two or three quick messages; waiting this long lets one reply cover them all.
const GRACE_MS = 1500;

const field = ref(null);
const log = ref(null);
const challenge = ref(null);
const draft = ref("");
const verifyFailed = ref(false);
// Shown as the visitor's bubbles at once, sent as one turn after the pause or when the current reply ends.
const queue = ref([]);
let graceTimer = null;
let turnstile = null;

const saved = loadSession();
const conversation = shallowRef(
  saved
    ? { id: saved.id, messages: saved.messages, previousId: saved.previousId ?? null }
    : { id: crypto.randomUUID(), messages: [], previousId: null },
);
const continuing = computed(() => Boolean(conversation.value.previousId));

// Nothing from an earlier chat is reused until the visitor chooses to continue it.
const resumeOffer = ref(null);
async function offerResume(previousId) {
  if (!previousId) return;
  try {
    const response = await fetch("/api/chat-resume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ previousId, visitorId: visitorId() }),
    });
    const { resume } = await response.json();
    if (resume && !messages.value.length) resumeOffer.value = { previousId, details: resume };
    else if (!resume) forgetChat();
  } catch {
  }
}
const resumeSummary = computed(() => {
  const d = resumeOffer.value?.details ?? {};
  return [d.vehicle, d.phone && `phone ${d.phone}`, d.email].filter(Boolean).join(", ");
});

function continueChat() {
  const { previousId } = resumeOffer.value;
  const unfinished = loadDraft(previousId);
  if (Object.values(unfinished).some((v) => String(v ?? "").trim())) saveDraft(conversation.value.id, unfinished);
  conversation.value = { ...conversation.value, previousId };
  resumeOffer.value = null;
  focusInput();
}

function startFresh() {
  if (resumeOffer.value) clearDraft(resumeOffer.value.previousId);
  forgetChat();
  resumeOffer.value = null;
}
let lastActive = saved?.savedAt ?? Date.now();

const transport = new DefaultChatTransport({
  api: "/api/chat",
  body: async () => ({
    visitorId: visitorId(),
    pageUrl: location.href,
    turnstileToken: isVerified(messages.value) ? undefined : await turnstile.token(),
    previousId: conversation.value.previousId ?? undefined,
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
const latestCardId = computed(() => findLatestCardId(messages.value));
const noReply = computed(() => status.value === "ready" && !verifyFailed.value && lastReplyMissing(messages.value));

watch([id, messages, status], () => {
  if (status.value === "streaming") return;
  lastActive = Date.now();
  saveSession({ id: id.value, messages: messages.value, previousId: conversation.value.previousId }, lastActive);
  if (isVerified(messages.value)) rememberChat(id.value, lastActive);
});

// The old conversation stays in the database; the visitor id still links it to this one.
function startNewChat() {
  if (busy.value) return;
  const earlier = isVerified(messages.value) ? id.value : resumeOffer.value?.previousId ?? conversation.value.previousId;
  conversation.value = { id: crypto.randomUUID(), messages: [], previousId: null };
  resumeOffer.value = null;
  offerResume(earlier);
  clearTimeout(graceTimer);
  graceTimer = null;
  queue.value = [];
  draft.value = "";
  verifyFailed.value = false;
  turnstile?.warm();
  focusInput();
}

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
  const texts = (messages.value.at(-1)?.parts ?? []).filter((p) => p.type === "text").map((p) => p.text);
  conversation.value = { id: crypto.randomUUID(), messages: [], previousId: conversation.value.previousId };
  await nextTick();
  sendTexts(texts);
});

// Send is greyed only when a message cannot go anywhere; an empty box or a reply in progress is not that.
const online = ref(typeof navigator === "undefined" || navigator.onLine !== false);
const updateOnline = () => (online.value = navigator.onLine !== false);
const unusable = computed(() => !online.value || blocksChat(messages.value));

const placeholder = computed(() => (unusable.value ? "Chat unavailable right now" : "Type your message"));

const shaking = ref(false);
let shakeTimer = null;
const sendButton = ref(null);
async function nudgeEmpty() {
  clearTimeout(shakeTimer);
  shaking.value = false;
  await nextTick();
  // Reading layout between removing and re-adding the class restarts the animation on repeated clicks.
  void sendButton.value?.offsetWidth;
  shaking.value = true;
  shakeTimer = setTimeout(() => (shaking.value = false), SHAKE_MS);
  focusInput();
}

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

// Follows a streaming reply only while the visitor is near the bottom; their own new message always scrolls.
watch(
  () => [messages.value.length, messages.value.at(-1)],
  ([length], [previous] = []) => {
    const sentByVisitor = length !== previous && messages.value.at(-1)?.role === "user";
    if (sentByVisitor || !awayFromBottom.value) scrollToBottom();
  },
);

watch(() => queue.value.length, (length, previous) => {
  if (length > previous) scrollToBottom();
});

watch([noReply, failed, verifyFailed], (states) => {
  if (states.some(Boolean)) scrollToBottom("smooth");
});

function sendTexts(texts) {
  const parts = texts.map((t) => t.trim().slice(0, MAX_CHARS)).filter(Boolean).map((text) => ({ type: "text", text }));
  if (!parts.length || busy.value) return;
  if (status.value === "error") clearError();
  sendMessage({ parts });
}

function flush() {
  clearTimeout(graceTimer);
  graceTimer = null;
  if (busy.value || !queue.value.length) return;
  const { burst, rest } = nextBurst(queue.value);
  queue.value = rest;
  sendTexts(burst);
}

watch(status, (now) => {
  if (now === "ready" && queue.value.length && !graceTimer) flush();
});

function ask(reply) {
  if (resumeOffer.value) startFresh();
  const answer = props.settings.localAnswers?.[reply];
  if (!answer) {
    queue.value = [...queue.value, reply];
    return flush();
  }
  if (busy.value) return;
  messages.value = [...messages.value, ...localExchange(reply, answer)];
}

// A conversation the server verified can send a request from the form even when the chat itself has stopped.
function openForm() {
  messages.value = [...messages.value, localForm()];
}

function onSent(toolCallId) {
  messages.value = sentNote(toolCallId, messages.value, unusable.value ? SENT_CLOSED : undefined);
  focusInput();
}

function submit() {
  if (unusable.value) return;
  if (resumeOffer.value && draft.value.trim()) startFresh();
  const text = draft.value.trim().slice(0, MAX_CHARS);
  if (!text) return nudgeEmpty();
  if (verifyFailed.value) return retry();
  draft.value = "";
  queue.value = [...queue.value, text];
  clearTimeout(graceTimer);
  graceTimer = setTimeout(flush, GRACE_MS);
}

function retry() {
  verifyFailed.value = false;
  clearError();
  regenerate();
}

// Grows with its text up to the CSS max-height (four lines), then scrolls inside itself.
function fitField() {
  const el = field.value;
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`;
}
watch(draft, () => nextTick(fitField));

// Enter sends and Shift+Enter adds a line; Enter that confirms an IME composition must not send.
function onEnter(event) {
  if (event.isComposing) return;
  event.preventDefault();
  submit();
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

// Starts hidden and is shown a frame later, so the first open animates like every other.
const shown = ref(false);
watch(
  () => props.open,
  (open) => {
    shown.value = open;
    if (open && messages.value.length && isExpired(lastActive)) startNewChat();
  },
);

onMounted(() => {
  if (!saved) offerResume(recentChatId());
  window.addEventListener("online", updateOnline);
  window.addEventListener("offline", updateOnline);
  requestAnimationFrame(() => requestAnimationFrame(() => (shown.value = props.open)));
  turnstile = createTurnstile(challenge.value, props.settings.turnstileSiteKey);
  if (!isVerified(messages.value)) turnstile.warm();
  if (hasUnsentFirstMessage(messages.value)) verifyFailed.value = true;
  emit("ready");
  if (props.open) {
    scrollToBottom();
    focusInput();
  }
});

onBeforeUnmount(() => {
  turnstile?.remove();
  window.removeEventListener("online", updateOnline);
  window.removeEventListener("offline", updateOnline);
  clearTimeout(shakeTimer);
  clearTimeout(graceTimer);
});
</script>

<template>
  <section
    class="chat-panel"
    :class="{ 'is-open': shown }"
    :aria-hidden="!shown"
    role="dialog"
    aria-modal="false"
    aria-labelledby="chat-panel-title"
    @keydown.esc.stop="emit('close')"
  >
    <header class="head">
      <h2 id="chat-panel-title" class="head-title">Chat with us</h2>
      <button v-if="messages.length" type="button" class="new-chat" :disabled="busy" @click="startNewChat">
        New chat
      </button>
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
      <p v-if="continuing" class="continuing">Continuing from your earlier chat</p>
      <div v-else-if="resumeOffer" class="resume" role="group" aria-label="Continue your earlier chat">
        <p>
          Welcome back. Want to pick up where you left off? We'll reuse what you told us before<template v-if="resumeSummary">
            ({{ resumeSummary }})</template> so you don't have to repeat it.
        </p>
        <div class="resume-actions">
          <button type="button" class="resume-continue" @click="continueChat">Continue</button>
          <button type="button" class="resume-fresh" @click="startFresh">Start fresh</button>
        </div>
      </div>

      <div v-if="!messages.length && !queue.length" class="quick-replies">
        <button v-for="reply in settings.quickReplies" :key="reply" type="button" @click="ask(reply)">
          {{ reply }}
        </button>
      </div>

      <template v-for="message in messages" :key="message.id">
        <div v-if="STATES.includes(chatState(message))" class="state-view" role="status">
          <p>{{ textOf(message) || unavailable }}</p>
          <div v-if="chatReason(message) !== 'too_long'" class="state-links">
            <a :href="settings.phoneHref" class="call">Call {{ settings.phoneDisplay }}</a>
            <button v-if="chatReason(message) === 'conversation_limit'" type="button" class="quote" @click="startNewChat">New chat</button>
            <button v-else-if="isVerified(messages)" type="button" class="quote" @click="openForm">Request a quote</button>
            <a v-else href="/contact-us" class="quote">Request a quote</a>
          </div>
        </div>
        <template v-else>
          <template v-for="(part, index) in displayParts(message)" :key="`${message.id}-${index}`">
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
              :superseded="part.toolCallId !== latestCardId"
              :local-area-codes="settings.localAreaCodes"
              :consent-text="settings.callbackConsent"
              @sent="onSent(part.toolCallId)"
            />
          </template>
        </template>
      </template>

      <p v-for="(text, index) in queue" :key="`queued-${index}`" class="bubble from-visitor">{{ text }}</p>

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
      <textarea
        ref="field"
        aria-label="Your message"
        v-model="draft"
        rows="1"
        :maxlength="MAX_CHARS"
        autocomplete="off"
        :placeholder="placeholder"
        :disabled="unusable"
        @input="fitField"
        @keydown.enter.exact="onEnter"
      ></textarea>
      <button ref="sendButton" type="submit" class="send" :class="{ shake: shaking }" :disabled="unusable">Send</button>
    </form>
  </section>
</template>

<style scoped>
.chat-panel {
  @apply fixed inset-x-2 top-2 z-[1000] flex flex-col overflow-hidden rounded-lg border-2 border-brand-navy bg-white shadow-[0_8px_24px_rgba(0,0,0,0.25)];
  bottom: calc(3.5rem + env(safe-area-inset-bottom, 0px) + 0.5rem);
  @apply pointer-events-none invisible opacity-0;
  transform: translateY(16px);
  transition:
    opacity 150ms ease-in,
    transform 150ms ease-in,
    visibility 0s linear 150ms;
}
.chat-panel.is-open {
  @apply pointer-events-auto visible opacity-100;
  transform: none;
  transition:
    opacity 200ms ease-out,
    transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1),
    visibility 0s linear 0s;
}
@media (min-width: 768px) {
  .chat-panel {
    @apply inset-x-auto top-auto right-4 bottom-4 w-[22rem];
    height: min(36rem, calc(100vh - 2rem));
    transform-origin: bottom right;
    transform: translateY(12px) scale(0.92);
  }
  .chat-panel.is-open {
    transform: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .chat-panel,
  .chat-panel.is-open {
    transform: none;
    transition:
      opacity 120ms linear,
      visibility 0s linear 120ms;
  }
  .chat-panel.is-open {
    transition: opacity 120ms linear;
  }
}
.head {
  @apply flex items-center justify-between bg-brand-navy px-4 py-3 text-white;
}
.head-title {
  @apply text-[16px] font-bold;
}
.new-chat {
  @apply ml-auto mr-2 rounded-full border border-white/60 px-3 py-1 text-sm font-semibold text-white hover:border-brand-yellow hover:text-brand-yellow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow disabled:opacity-50;
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
.resume {
  @apply rounded-lg border border-brand-yellow/60 bg-brand-yellow/15 p-3 text-[14px] text-gray-900;
}
.resume-actions {
  @apply mt-2 grid grid-cols-2 gap-2;
}
.resume-continue {
  @apply rounded-lg bg-brand-navy py-2 font-bold text-white hover:opacity-90;
}
.resume-fresh {
  @apply rounded-lg border-2 border-brand-navy py-2 font-bold text-brand-navy hover:bg-white;
}
.continuing {
  @apply self-center rounded-full bg-brand-yellow/25 px-3 py-1 text-[12px] font-semibold text-brand-navy;
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
  @apply flex items-end gap-2 border-t border-gray-200 bg-white p-2;
}
.composer textarea {
  @apply min-w-0 flex-1 resize-none overflow-y-auto overscroll-contain rounded-lg border border-gray-300 p-2 text-[16px] leading-6 focus:outline-none focus:ring-2 focus:ring-blue-400;
  /* Four lines of 24px plus padding and border; past that the box scrolls instead of growing. */
  max-height: calc(4 * 1.5rem + 1rem + 2px);
}
.send {
  @apply h-[42px] shrink-0 rounded-lg bg-brand-navy px-4 font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60;
}
.composer textarea:disabled {
  @apply cursor-not-allowed bg-gray-100;
}
.send.shake {
  animation: send-shake 400ms ease-in-out;
}
@keyframes send-shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-5px); }
  40%, 80% { transform: translateX(5px); }
}
@media (prefers-reduced-motion: reduce) {
  .send.shake {
    animation: send-flash 400ms linear;
  }
  @keyframes send-flash {
    50% { @apply bg-brand-yellow text-brand-navy; }
  }
}
</style>
