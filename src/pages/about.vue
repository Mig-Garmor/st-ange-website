<script setup>
import PageLayout from "@components/wrappers/PageLayout.vue";
import GoogleMapsWidget from "@components/blocks/GoogleMapsWidget.vue";
import ImageTextBlock from "../components/blocks/ImageTextBlock.vue";
import { useHead } from "@vueuse/head";

// ✅ SEO metadata
useHead({
  title: "About St Ange Auto Service | Family-Owned Mechanic in Baytown, TX",
  meta: [
    {
      name: "description",
      content:
        "Learn about St Ange Auto Service, a trusted family-owned mechanic shop in Baytown, TX. Over 30 years of experience in car repair, brakes, alignment, and A/C service.",
    },
  ],
});
</script>

<template>
  <PageLayout>
    <main class="about-us-page-container">
      <section class="text-container max-w-4xl mx-auto p-6">
        <h1 class="text-[40px] font-bold text-center mb-8">
          About St Ange Auto Service
        </h1>

        <ImageTextBlock
          image="assets/st-lucia-family.webp"
          text="We’re a proud family-owned St. Lucian mechanic shop located right here in Baytown, Texas. Our story began with a passion for cars and helping people stay safely on the road."
          alt="St Lucia family"
        />

        <ImageTextBlock
          image="/assets/working-with-uncle.webp"
          text="What started over 30 years ago with our owner lending a hand at his uncle's tire shop and later running a mobile mechanic business from his truck has grown into a full-service local auto repair shop known for honesty and quality workmanship."
          alt="Working with Uncle"
        />

        <ImageTextBlock
          image="/assets/satisfied-customers.webp"
          text="Customer satisfaction is our top priority. We believe in clear communication, fair pricing, and reliable service that earns your trust."
          alt="Satisfied customers"
        />

        <ImageTextBlock
          image="/assets/more-services.webp"
          text="Our experienced team specializes in alignments, brakes, A/C repair, suspension and steering work, and tire services — all done with professional care and attention to detail."
          alt="More Services"
        />

        <ImageTextBlock
          image="/assets/customer-deal.webp"
          text="Every customer is treated like family. When you visit St Ange Auto Service, you’ll receive personal service and leave confident your car is in great hands."
          alt="Customer Deal"
        />
      </section>

      <section class="mt-10">
        <h2 class="text-[32px] font-bold text-center mb-6">
          Find Us in Baytown
        </h2>
        <GoogleMapsWidget />
      </section>
    </main>
  </PageLayout>
</template>

<style src="@styles/pages/about.css"></style>
