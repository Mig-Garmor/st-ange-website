<script setup>
import PageLayout from "@components/wrappers/PageLayout.vue";
import GoogleMapsWidget from "@components/blocks/GoogleMapsWidget.vue";
import ImageTextBlock from "@components/blocks/ImageTextBlock.vue";
import CallToActionBand from "@components/blocks/CallToActionBand.vue";
import { usePageSeo } from "@composables/usePageSeo";

usePageSeo({
  title: "About St Ange Auto Service | Family-Owned Mechanic in Baytown, TX",
  description:
    "Learn about St Ange Auto Service, a trusted family-owned mechanic shop in Baytown, TX. Over 30 years of experience in car repair, brakes, alignment, and A/C service.",
  path: "/about",
  image: "/assets/st-lucia-family.webp",
});

const story = [
  {
    image: "/assets/st-lucia-family.webp",
    alt: "The St Ange family",
    title: "A St. Lucian family in Baytown",
    text: "We’re a proud family-owned St. Lucian mechanic shop located right here in Baytown, Texas. Our story began with a passion for cars and helping people stay safely on the road.",
  },
  {
    image: "/assets/working-with-uncle.webp",
    alt: "The owner working at his uncle's tire shop",
    title: "Over 30 years of hands-on work",
    text: "What started over 30 years ago with our owner lending a hand at his uncle's tire shop and later running a mobile mechanic business from his truck has grown into a full-service local auto repair shop known for honesty and quality workmanship.",
  },
  {
    image: "/assets/satisfied-customers.webp",
    alt: "Satisfied customers at the shop",
    title: "Clear answers, fair prices",
    text: "Customer satisfaction is our top priority. We believe in clear communication, fair pricing, and reliable service that earns your trust.",
  },
  {
    image: "/assets/more-services.webp",
    alt: "Illustration of car repair services",
    title: "The work we do",
    text: "Our experienced team specializes in alignments, brakes, A/C repair, suspension and steering work, and tire services — all done with professional care and attention to detail.",
    link: { to: "/services", label: "See all our services" },
  },
  {
    image: "/assets/customer-deal.webp",
    alt: "Customer shaking hands with the mechanic",
    title: "Treated like family",
    text: "Every customer is treated like family. When you visit St Ange Auto Service, you’ll receive personal service and leave confident your car is in great hands.",
  },
];
</script>

<template>
  <PageLayout>
    <main class="about-us-page-container">
      <header class="about-hero">
        <div class="about-hero-inner">
          <h1>About St Ange Auto Service</h1>
          <p>A family-owned St. Lucian mechanic shop on North Main Street in Baytown, Texas.</p>
        </div>
      </header>

      <section class="story" aria-label="Our story">
        <ImageTextBlock
          v-for="(block, index) in story"
          :key="block.image"
          v-bind="block"
          :reversed="index % 2 === 1"
        />
      </section>

      <CallToActionBand
        title="Come meet the family"
        text="Call us to talk through what your car needs, or book a time to bring it in."
      />

      <section class="find-us">
        <h2>Find Us in Baytown</h2>
        <GoogleMapsWidget />
      </section>
    </main>
  </PageLayout>
</template>

<style src="@styles/pages/about.css"></style>
