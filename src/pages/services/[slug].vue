<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import { Icon } from "@iconify/vue";

import PageLayout from "@components/wrappers/PageLayout.vue";
import Breadcrumbs from "@components/utilities/Breadcrumbs.vue";
import Badge from "@components/utilities/Badge.vue";
import ReviewCard from "@components/blocks/ReviewCard.vue";
import FaqList from "@components/blocks/FaqList.vue";
import CallToActionBand from "@components/blocks/CallToActionBand.vue";
import ServiceCard from "@components/ServiceCard.vue";
import QuoteForm from "@components/forms/QuoteForm.vue";
import { usePageSeo } from "@composables/usePageSeo";
import { business } from "@/config/business";
import { findServicePage, servicePages } from "@/content/services";
import { reviewsForService } from "@/content/reviews";
import { reasons } from "@/content/home";
import { serviceNode } from "@/seo/serviceSchema";

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
  crumbs: crumbs.value,
  mainEntity: serviceNode(service.value),
});

</script>

<template>
  <PageLayout call-bar-hidden-over=".service-hero">
    <main id="main" class="service-page">
      <header class="service-hero">
        <div class="service-hero-inner">
          <div class="service-hero-text">
            <Breadcrumbs :crumbs="crumbs" />
            <h1>{{ service.h1 }}</h1>
            <p>{{ service.summary }}</p>
            <div class="hero-actions">
              <Badge text="Call us" icon="mdi:phone" :href="business.phone.href" />
              <Badge v-if="service.quote" :text="service.quote.button" icon="mdi:calculator" :to="{ hash: '#quote' }" />
              <Badge
                v-else
                text="Request service"
                icon="mdi:calendar-check"
                :to="{ path: '/contact-us', query: { subject: service.name } }"
              />
            </div>
          </div>
          <img :src="service.image" :alt="service.name" class="service-hero-image" width="260" height="260" />
        </div>
      </header>

      <section class="service-section service-intro">
        <p v-for="paragraph in service.intro" :key="paragraph">{{ paragraph }}</p>
      </section>

      <section v-if="service.feature" class="service-section service-feature">
        <h2 class="service-section-title">{{ service.feature.title }}</h2>
        <ul v-if="service.feature.items" class="feature-items">
          <li v-for="item in service.feature.items" :key="item.title">
            <h3>{{ item.title }}</h3>
            <p>{{ item.text }}</p>
          </li>
        </ul>
        <p v-for="paragraph in service.feature.paragraphs" :key="paragraph">{{ paragraph }}</p>
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

      <section v-if="service.related" class="service-section">
        <div class="related-callout">
          <h2>{{ service.related.title }}</h2>
          <p>{{ service.related.text }}</p>
          <Badge :text="service.related.label" icon="mdi:arrow-right" :to="`/services/${service.related.slug}`" />
        </div>
      </section>

      <section v-if="service.quote" id="quote" class="service-section service-quote">
        <div class="quote-text">
          <h2>{{ service.quote.title }}</h2>
          <p>{{ service.quote.text }}</p>
          <p>Prefer to talk? Call us and we'll give you a price over the phone.</p>
          <Badge :text="`Call ${business.phone.display}`" icon="mdi:phone" :href="business.phone.href" class="quote-call" />
        </div>
        <QuoteForm :service="service.slug" />
      </section>

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
            :service="other.slug"
          />
        </div>
      </section>
    </main>
  </PageLayout>
</template>

<style src="@styles/pages/service.css"></style>
