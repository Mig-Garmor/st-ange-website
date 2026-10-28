<script setup>
import PageLayout from "@components/wrappers/PageLayout.vue";
import ContactUsFormComponent from "@components/forms/ContactUsFormComponent.vue";
import GoogleMapsWidget from "@components/blocks/GoogleMapsWidget.vue";
import HoursList from "@components/utilities/HoursList.vue";
import IconText from "@components/utilities/IconText.vue";
import Badge from "@components/utilities/Badge.vue";
import { usePageSeo } from "@composables/usePageSeo";
import { business, fullAddress } from "@/config/business";
import { addressNote } from "@/content/relocation";

usePageSeo({
  title: "Contact St Ange Auto Service | Auto Repair in Baytown, TX",
  description:
    "Contact St Ange Auto Service, an auto repair shop in Baytown, TX. Call 832-572-7121 or send a message about brakes, A/C, alignment or any car repair.",
  path: "/contact-us",
});
</script>

<template>
  <PageLayout>
    <main class="contact-page">
      <header class="contact-intro">
        <h1>Contact St Ange Auto Service in Baytown, TX</h1>
        <p>
          Have a question or need to schedule a repair? Call us or send a message and we'll get back to you.
        </p>
      </header>

      <div class="contact-grid">
        <aside class="contact-details" aria-label="Call or visit">
          <h2>Call or visit</h2>
          <Badge
            :text="`Call ${business.phone.display}`"
            icon="mdi:phone"
            :href="business.phone.href"
            class="contact-call"
          />
          <IconText icon="mdi:location" :text="fullAddress" :href="business.links.maps" external :icon-size="20" />
          <p class="contact-address-note">{{ addressNote }}</p>
          <a :href="business.links.maps" target="_blank" rel="noopener" class="contact-directions">Get directions →</a>
          <div class="contact-hours">
            <h3>Hours</h3>
            <HoursList compact />
          </div>
          <p class="contact-note">Give us a call before you stop by so we can make sure a bay is free.</p>
        </aside>

        <section class="contact-form" aria-labelledby="contact-form-title">
          <h2 id="contact-form-title">Send us a message</h2>
          <ContactUsFormComponent />
        </section>
      </div>

      <section class="find-us">
        <h2>Find Us in Baytown</h2>
        <GoogleMapsWidget />
      </section>
    </main>
  </PageLayout>
</template>

<style src="@styles/pages/contact-us.css"></style>
