<script setup>
import PageLayout from "@components/wrappers/PageLayout.vue";
import Breadcrumbs from "@components/utilities/Breadcrumbs.vue";
import ServiceCard from "@components/ServiceCard.vue";
import CallToActionBand from "@components/blocks/CallToActionBand.vue";
import { usePageSeo } from "@composables/usePageSeo";
import { pageDescriptions } from "@/content/pages";
import { business } from "@/config/business";
import { servicePages } from "@/content/services";

const crumbs = [
  { label: "Home", to: "/" },
  { label: "Services", to: "/services" },
];

usePageSeo({
  title: "Auto Repair Services in Baytown, TX | St Ange Auto Service",
  description: pageDescriptions.services,
  path: "/services",
  type: "CollectionPage",
  crumbs,
});
</script>

<template>
  <PageLayout>
    <main class="service-page">
      <header class="service-hero service-hero--compact">
        <div class="service-hero-inner">
          <div class="service-hero-text">
            <Breadcrumbs :crumbs="crumbs" />
            <h1>Auto Repair Services in Baytown, TX</h1>
            <p>
              From alignments and brakes to A/C, suspension and tires, our family-owned auto repair shop on
              {{ business.address.area }} handles the car repair and car service Baytown drivers need. Choose a service to learn more.
            </p>
          </div>
        </div>
      </header>

      <section class="service-section">
        <div class="services-overview">
          <ServiceCard
            v-for="service in servicePages"
            :key="service.slug"
            :image="service.image"
            :name="service.name"
            :summary="service.summary"
            :to="`/services/${service.slug}`"
            :service="service.slug"
          />
        </div>
      </section>

      <CallToActionBand
        title="Not sure what your car needs?"
        text="Call us and describe what you're hearing or feeling. We'll tell you honestly what it's likely to be and how we can help."
      />
    </main>
  </PageLayout>
</template>

<style src="@styles/pages/service.css"></style>
