<script setup>
import PageLayout from "@components/wrappers/PageLayout.vue";
import ContactUsFormComponent from "@components/forms/ContactUsFormComponent.vue";
import { useHead } from "@vueuse/head";
import GoogleMapsWidget from "../components/blocks/GoogleMapsWidget.vue";

// ✅ SEO metadata
useHead({
  title: "Contact St Ange Auto Service | Auto Repair in Baytown, TX",
  meta: [
    {
      name: "description",
      content:
        "Get in touch with St Ange Auto Service in Baytown, TX. Call 832-572-7121 or send us a message for expert car repair, brake, A/C, and alignment services.",
    },
  ],
});
</script>

<template>
  <PageLayout>
    <main class="contact-us-page-container max-w-3xl mx-auto p-6">
      <h1 class="text-[40px] font-bold text-center mb-6">
        Contact St Ange Auto Service
      </h1>

      <p class="text-center mb-8 text-[18px] text-gray-700">
        Have a question or need to schedule a repair? Fill out the form below or
        call us at
        <a href="tel:832-572-7121" class="text-blue-600 underline font-semibold"
          >832-572-7121</a
        >. We’re located at <strong>1300 N Main St, Baytown, TX 77520</strong>.
      </p>

      <section>
        <ContactUsFormComponent />
      </section>

      <section class="mt-10 text-center flex flex-col items-center">
        <h2 class="text-[28px] font-bold mb-4">Visit Our Shop</h2>
        <p class="mb-4">
          Opening hours vary. Give us a call before you stop by.
        </p>
        <GoogleMapsWidget />
      </section>
    </main>
  </PageLayout>
</template>

<style src="@styles/pages/contact-us.css"></style>
