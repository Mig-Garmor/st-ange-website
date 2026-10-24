<script setup>
import { Icon } from "@iconify/vue";

import PageLayout from "@components/wrappers/PageLayout.vue";
import ServiceCard from "@components/ServiceCard.vue";
import Badge from "@components/utilities/Badge.vue";
import HoursList from "@components/utilities/HoursList.vue";
import IconText from "@components/utilities/IconText.vue";
import GoogleMapsWidget from "@components/blocks/GoogleMapsWidget.vue";
import ReviewCard from "@components/blocks/ReviewCard.vue";
import FaqList from "@components/blocks/FaqList.vue";
import { usePageSeo } from "@composables/usePageSeo";
import { business, fullAddress, services } from "@/config/business";
import { reasons, faqs } from "@/content/home";
import { addressNote } from "@/content/relocation";
import { featuredReviews } from "@/content/reviews";

usePageSeo({
  title: "Auto Repair & Mechanic in Baytown, TX | St Ange Auto Service",
  description:
    `Family-owned auto repair shop on ${business.address.area} in Baytown, TX. Alignments, A/C repair, brakes, suspension and new & used tires with fair, upfront pricing. Call ${business.phone.display}.`,
  path: "/",
});

const trustPoints = [
  { icon: "mdi:star", text: `${business.googleRating} Google rating` },
  { icon: "mdi:account-group", text: "Family-owned" },
  { icon: "mdi:wrench", text: `${business.yearsExperience} years experience` },
  { icon: "mdi:clock-outline", text: business.hoursShort },
];
</script>

<template>
  <PageLayout>
    <main class="index-page-container">
      <header class="hero">
        <div class="hero-overlay">
          <div class="hero-heading">
            <p class="hero-eyebrow">{{ business.name }}</p>
            <h1 class="hero-title">Auto Repair &amp; Mechanic in Baytown, TX</h1>
            <p class="hero-subtitle">
              Honest diagnosis, fair prices and quality repairs from a family-owned shop on {{ business.address.area }}.
            </p>
          </div>

          <div class="call-to-action">
            <Badge text="Call us" icon="mdi:phone" :href="business.phone.href" />
            <Badge text="Request service" icon="mdi:calendar-check" to="/contact-us" />
            <Badge text="Find us" icon="mdi:location" :href="business.links.maps" external />
          </div>

          <ul class="trust-bar">
            <li v-for="point in trustPoints" :key="point.text">
              <Icon :icon="point.icon" width="18" height="18" aria-hidden="true" />
              {{ point.text }}
            </li>
          </ul>
        </div>
      </header>

      <section class="page-section intro">
        <h2 class="section-title">Your Local Mechanic in Baytown</h2>
        <p>
          St Ange Auto Service is a family-owned auto repair shop at {{ fullAddress }}.
          Our owner has been fixing cars for more than 30 years, starting at his uncle's tire shop
          and later running a mobile mechanic business from his truck. Today our Baytown shop handles
          wheel alignments, A/C repair, brakes, suspension and steering, and new and used tires.
        </p>
        <p>
          Whether your car is making a new noise, the A/C is blowing warm or your tires are worn out,
          we'll find the problem, explain it in plain language and give you a fair price before any work starts.
        </p>
      </section>

      <section id="services" class="page-section services-section">
        <h2 class="section-title">Our Auto Repair Services</h2>
        <div class="services">
          <ServiceCard
            v-for="service in services"
            :key="service.name"
            :image="service.image"
            :name="service.name"
            :summary="service.summary"
            :to="`/services/${service.slug}`"
          />
          <ServiceCard
            image="/assets/more-services.webp"
            name="And More..."
            summary="Not sure what's wrong? Call us or send a message describing the problem and we'll tell you how we can help."
            to="/contact-us"
          />
        </div>
      </section>

      <section class="page-section">
        <h2 class="section-title">Why Baytown Drivers Choose Us</h2>
        <ul class="reasons">
          <li v-for="reason in reasons" :key="reason.title" class="reason">
            <span class="reason-icon">
              <Icon :icon="reason.icon" width="26" height="26" aria-hidden="true" />
            </span>
            <h3>{{ reason.title }}</h3>
            <p>{{ reason.text }}</p>
          </li>
        </ul>
      </section>

      <section class="page-section reviews-section">
        <h2 class="section-title">What Our Customers Say</h2>
        <p class="section-lead">
          Rated {{ business.googleRating }} out of 5 by our customers on Google.
        </p>
        <div class="reviews">
          <ReviewCard
            v-for="review in featuredReviews"
            :key="review.author"
            v-bind="review"
          />
        </div>
        <Badge
          text="Read all reviews on Google"
          icon="carbon:star-review"
          :href="business.links.reviews"
          external
          class="mx-auto"
        />
      </section>

      <section class="page-section visit">
        <div class="visit-details">
          <h2 class="section-title">Visit Our Baytown Shop</h2>
          <IconText icon="mdi:location" :text="fullAddress" :href="business.links.maps" external />
          <p class="address-note">{{ addressNote }}</p>
          <IconText icon="mdi:phone" :text="business.phone.display" :href="business.phone.href" />
          <HoursList class="mt-2" />
          <p class="text-gray-700">Give us a call before you come in so we can make sure a bay is free.</p>
          <Badge text="Call us" icon="mdi:phone" :href="business.phone.href" class="self-start" />
        </div>
        <GoogleMapsWidget />
      </section>

      <section class="page-section faq-section">
        <h2 class="section-title">Frequently Asked Questions</h2>
        <FaqList :items="faqs">
          <template #answer="{ item }">
            <HoursList v-if="item.id === 'hours'" />
            <p>{{ item.answer }}</p>
          </template>
        </FaqList>
      </section>
    </main>
  </PageLayout>
</template>

<style src="@styles/pages/index.css"></style>
