<script setup>
import PageLayout from "@components/wrappers/PageLayout.vue";
import ServiceCard from "@components/ServiceCard.vue";
import Badge from "@components/utilities/Badge.vue";
import GoogleMapsWidget from "@components/blocks/GoogleMapsWidget.vue";
import GoogleReviewsWidget from "@components/blocks/GoogleReviewsWidget.vue";
import { usePageSeo } from "@composables/usePageSeo";
import { business, services } from "@/config/business";

usePageSeo({
  title: "Auto Repair & Mechanic in Baytown, TX | St Ange Auto Service",
  description:
    "Looking for an auto repair shop in Baytown, TX? St Ange Auto Service offers professional car alignment, brake repair, A/C service, tires, and more. Call 832-572-7121!",
  path: "/",
});

const contactFor = (subject) => ({ path: "/contact-us", query: { subject } });
</script>

<template>
  <PageLayout>
    <main class="index-page-container">
      <header class="title-container">
        <div class="hero-overlay">
          <h1 class="hero-title">
            St Ange Auto Service<br />
            Baytown Car Repair &amp; Mechanic
          </h1>

          <div class="call-to-action">
            <Badge text="Call us" icon="mdi:phone" :href="business.phone.href" />
            <Badge text="Find us" icon="mdi:location" :href="business.links.maps" external />
            <Badge text="Reviews" icon="carbon:star-review" :icon-size="26" :href="business.links.reviews" external />
          </div>
        </div>
      </header>

      <section class="flex flex-col items-center w-full py-10">
        <h2 class="text-[40px] text-center font-bold mb-6">Our Services</h2>
        <div class="services">
          <ServiceCard
            v-for="service in services"
            :key="service.name"
            :image="service.image"
            :name="service.name"
            :to="contactFor(service.name)"
          />
          <ServiceCard image="/assets/more-services.webp" name="And More..." to="/contact-us" />
        </div>
      </section>

      <GoogleMapsWidget />

      <section class="py-10 w-full">
        <h2 class="text-[40px] text-center font-bold mb-6">Customer Reviews</h2>
        <GoogleReviewsWidget />
      </section>
    </main>
  </PageLayout>
</template>

<style src="@styles/pages/index.css"></style>
