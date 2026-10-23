<script setup>
import PageLayout from "@components/wrappers/PageLayout.vue";
import ContactUsFormComponent from "@components/forms/ContactUsFormComponent.vue";
import GoogleMapsWidget from "@components/blocks/GoogleMapsWidget.vue";
import HoursList from "@components/utilities/HoursList.vue";
import { usePageSeo } from "@composables/usePageSeo";
import { business, fullAddress } from "@/config/business";

usePageSeo({
  title: "Contact St Ange Auto Service | Auto Repair in Baytown, TX",
  description:
    "Get in touch with St Ange Auto Service in Baytown, TX. Call 832-572-7121 or send us a message for expert car repair, brake, A/C, and alignment services.",
  path: "/contact-us",
});
</script>

<template>
  <PageLayout>
    <main class="max-w-3xl mx-auto p-6">
      <h1 class="text-[32px] md:text-[40px] font-bold text-center mb-6">
        Contact St Ange Auto Service
      </h1>

      <p class="text-center mb-8 text-[18px] text-gray-700">
        Have a question or need to schedule a repair? Fill out the form below or
        call us at
        <a :href="business.phone.href" class="text-blue-600 underline font-semibold">{{
          business.phone.display
        }}</a>. We’re located at <strong>{{ fullAddress }}</strong>.
      </p>

      <section>
        <ContactUsFormComponent />
      </section>

      <section class="mt-10 text-center flex flex-col items-center">
        <h2 class="text-[28px] font-bold mb-4">Visit Our Shop</h2>
        <HoursList class="mb-4 text-left" />
        <p class="mb-4">Give us a call before you stop by so we can make sure a bay is free.</p>
        <GoogleMapsWidget />
      </section>
    </main>
  </PageLayout>
</template>
