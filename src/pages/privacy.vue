<script setup>
// Draft wording; owner to review.
import PageLayout from "@components/wrappers/PageLayout.vue";
import { usePageSeo } from "@composables/usePageSeo";
import { business } from "@/config/business";

const { retention } = business;

usePageSeo({
  title: "Privacy | St Ange Auto Service",
  description: "What we collect when you contact us or use our chat, and how to delete it.",
  path: "/privacy",
  crumbs: [{ label: "Home", to: "/" }, { label: "Privacy", to: "/privacy" }],
});
</script>

<template>
  <PageLayout>
    <main class="privacy-page-container">
      <header class="privacy-hero">
        <div class="privacy-hero-inner">
          <h1>Privacy</h1>
          <p>A plain-language look at what we keep when you contact us through this website.</p>
          <p class="privacy-updated">Last updated November 5, 2026</p>
        </div>
      </header>

      <div class="privacy-content">
        <section>
          <h2>What we collect</h2>
          <p>When you send us a quote request or use the chat on our website, we may collect:</p>
          <ul>
            <li>Your chat messages</li>
            <li>Your name, phone number and email</li>
            <li>Your vehicle details</li>
            <li>The page you were on when you contacted us</li>
            <li>Your agreement to be called or texted about your request, with the time you gave it</li>
            <li>
              A scrambled form of your IP address, used only to stop abuse and deleted after
              {{ retention.ipHashDays }} days. Our hosting and spam-check providers see your IP address to
              deliver the website and stop abuse, but we do not store it.
            </li>
          </ul>
        </section>

        <section>
          <h2>Why we collect it</h2>
          <p>To answer your questions, follow up on your request and improve our service.</p>
        </section>

        <section>
          <h2>The chat</h2>
          <p>
            The chat is answered by an automated AI assistant. We save the conversation to reply to you and
            follow up on your request, and once a day an AI writes a short summary of each chat for us. Prices
            and promises in the chat only count once the shop confirms them.
          </p>
          <p>
            Your messages are processed by an AI provider that does not keep them after answering and does
            not use them to train its models.
          </p>
          <p>
            Your browser keeps the open chat until you close the tab, plus a reference to your last chat for
            24 hours. If you come back within that time, the chat asks whether to continue with what you told us
            before, showing only part of your phone number and email. Choose "Start fresh" and that reference is
            removed.
          </p>
        </section>

        <section>
          <h2>Calls and texts</h2>
          <p>
            If you send a request and tick the box, we may call or text you about that request. Reply STOP to
            any text to stop texts. We do not use your details for marketing.
          </p>
        </section>

        <section>
          <h2>Who sees it</h2>
          <p>The shop sees it. So do the services that run this website for us:</p>
          <ul>
            <li>Vercel, which hosts the website</li>
            <li>Neon, our database, in the United States</li>
            <li>Brevo, which sends your request to the shop by email</li>
            <li>OpenRouter and the AI provider it routes the chat to</li>
            <li>Cloudflare Turnstile, which checks that a chat is from a person and not a bot</li>
          </ul>
          <p>We do not sell your information.</p>
        </section>

        <section>
          <h2>How long we keep it</h2>
          <ul>
            <li>Chat conversations: {{ retention.chatMonths }} months after your last message</li>
            <li>Requests and your contact details: {{ retention.leadYears }} years</li>
            <li>The scrambled IP address: {{ retention.ipHashDays }} days</li>
          </ul>
        </section>

        <section>
          <h2>Children</h2>
          <p>This website is not meant for children under 13, and we do not knowingly collect their information.</p>
        </section>

        <section>
          <h2>Ask us to delete it</h2>
          <p>
            Email <a :href="`mailto:${business.email}`">{{ business.email }}</a> or call
            <a :href="business.phone.href">{{ business.phone.display }}</a> and we will delete
            what we have about you.
          </p>
        </section>
      </div>
    </main>
  </PageLayout>
</template>

<style src="@styles/pages/privacy.css"></style>
