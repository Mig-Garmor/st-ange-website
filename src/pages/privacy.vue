<script setup>
// Draft wording; owner to review.
import PageLayout from "@components/wrappers/PageLayout.vue";
import { usePageSeo } from "@composables/usePageSeo";
import { business } from "@/config/business";

usePageSeo({
  title: "Privacy | St Ange Auto Service",
  description:
    "What St Ange Auto Service collects when you contact us or use our website chat, why, and how to ask us to delete it.",
  path: "/privacy",
});
</script>

<template>
  <PageLayout>
    <main class="privacy-page-container">
      <header class="privacy-hero">
        <div class="privacy-hero-inner">
          <h1>Privacy</h1>
          <p>A plain-language look at what we keep when you contact us through this website.</p>
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
            <li>
              A scrambled form of your IP address, used only to stop abuse and deleted after 7 days. We
              do not store the address itself.
            </li>
          </ul>
        </section>

        <section>
          <h2>Why we collect it</h2>
          <p>To answer your request and to improve our service.</p>
        </section>

        <section>
          <h2>Who sees it</h2>
          <p>
            The shop sees it. So do the services that run this website for us: hosting, database,
            email and AI providers.
          </p>
        </section>

        <section>
          <h2>How long we keep it</h2>
          <p>We keep it for as long as it is useful to the business.</p>
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
