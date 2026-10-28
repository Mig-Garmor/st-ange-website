<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useHead } from "@unhead/vue";
import { Icon } from "@iconify/vue";

import PageLayout from "@components/wrappers/PageLayout.vue";
import Breadcrumbs from "@components/utilities/Breadcrumbs.vue";
import Badge from "@components/utilities/Badge.vue";
import ReviewCard from "@components/blocks/ReviewCard.vue";
import FaqList from "@components/blocks/FaqList.vue";
import CallToActionBand from "@components/blocks/CallToActionBand.vue";
import ServiceCard from "@components/ServiceCard.vue";
import { usePageSeo } from "@composables/usePageSeo";
import { business } from "@/config/business";
import { findServicePage, servicePages } from "@/content/services";
import { reviewsForService } from "@/content/reviews";
import { reasons } from "@/content/home";
import { breadcrumbSchema, serviceSchema } from "@/seo/serviceSchema";
import { reviewsSchema } from "@/seo/reviewsSchema";

const route = useRoute();
const service = computed(() => findServicePage(route.params.slug));

const crumbs = computed(() => [
  { label: "Home", to: "/" },
  { label: "Services", to: "/services" },
  { label: service.value.name, to: `/services/${service.value.slug}` },
]);

const serviceReviews = computed(() => reviewsForService(service.value.slug));
const otherServices = computed(() => servicePages.filter((s) => s.slug !== service.value.slug));

usePageSeo({
  title: service.value.seoTitle,
  description: service.value.metaDescription,
  path: `/services/${service.value.slug}`,
  image: service.value.image,
});

useHead({
  script: [
    { type: "application/ld+json", key: "service", innerHTML: JSON.stringify(serviceSchema(service.value)) },
    { type: "application/ld+json", key: "breadcrumbs", innerHTML: JSON.stringify(breadcrumbSchema(crumbs.value)) },
    { type: "application/ld+json", key: "reviews", innerHTML: JSON.stringify(reviewsSchema(serviceReviews.value.cards)) },
  ],
});
</script>

<template>
  <PageLayout call-bar-hidden-over=".service-hero">
    <main class="service-page">
      <header class="service-hero">
        <div class="service-hero-inner">
          <Breadcrumbs :crumbs="crumbs" />
          <h1>{{ service.h1 }}</h1>
          <p>{{ service.summary }}</p>
          <div class="hero-actions">
            <Badge text="Call us" icon="mdi:phone" :href="business.phone.href" />
            <Badge
              text="Request service"
              icon="mdi:calendar-check"
              :to="{ path: '/contact-us', query: { subject: service.name } }"
            />
          </div>
        </div>
        <img :src="service.image" :alt="service.name" class="service-hero-image" width="260" height="260" />
      </header>

      <section class="service-section service-intro">
        <p v-for="paragraph in service.intro" :key="paragraph">{{ paragraph }}</p>
      </section>

      <div class="service-columns">
        <section class="service-panel">
          <h2>{{ service.signsTitle }}</h2>
          <ul class="check-list">
            <li v-for="sign in service.signs" :key="sign">
              <Icon icon="mdi:alert-circle-outline" width="22" height="22" aria-hidden="true" />
              {{ sign }}
            </li>
          </ul>
        </section>

        <section class="service-panel">
          <h2>{{ service.processTitle }}</h2>
          <ol class="process-list">
            <li v-for="step in service.process" :key="step">{{ step }}</li>
          </ol>
        </section>
      </div>

      <section class="service-section">
        <h2 class="service-section-title">Why choose St Ange Auto Service</h2>
        <ul class="reasons">
          <li v-for="reason in reasons" :key="reason.title">
            <Icon :icon="reason.icon" width="28" height="28" aria-hidden="true" />
            <div>
              <h3>{{ reason.title }}</h3>
              <p>{{ reason.text }}</p>
            </div>
          </li>
        </ul>
      </section>

      <section class="service-section">
        <h2 class="service-section-title">
          {{ serviceReviews.hasMatches ? `${service.name} reviews` : "What our customers say" }}
        </h2>
        <div class="service-reviews">
          <ReviewCard v-for="card in serviceReviews.cards" :key="card.author" v-bind="card" />
        </div>
        <Badge
          text="Read all reviews on Google"
          icon="carbon:star-review"
          :href="business.links.reviews"
          external
          class="mx-auto"
        />
      </section>

      <section class="service-section">
        <h2 class="service-section-title">{{ service.name }} FAQs</h2>
        <FaqList :items="service.faqs" />
      </section>

      <CallToActionBand
        :title="`Book ${service.name.toLowerCase()} in Baytown`"
        :subject="service.name"
      />

      <section class="service-section other-services">
        <h2 class="service-section-title">Other services</h2>
        <div class="other-services-grid">
          <ServiceCard
            v-for="other in otherServices"
            :key="other.slug"
            :image="other.image"
            :name="other.name"
            :to="`/services/${other.slug}`"
          />
        </div>
      </section>
    </main>
  </PageLayout>
</template>

<style src="@styles/pages/service.css"></style>
