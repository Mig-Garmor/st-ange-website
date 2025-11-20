<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import { useHead } from "@vueuse/head";

import PageLayout from "@components/wrappers/PageLayout.vue";
import ServiceCard from "@components/ServiceCard.vue";
import Badge from "@components/utilities/Badge.vue";
import GoogleMapsWidget from "../components/blocks/GoogleMapsWidget.vue";

const router = useRouter();
const featurableContainer = ref(null);

const googleReviewsUrl =
  "https://search.google.com/local/reviews?placeid=ChIJiRaP15ZdP4YRQL29VtCpdp0";
const googleMapsBusinessLink = "https://maps.app.goo.gl/kRiqUGChingHzADh6";

function handleCallUsClick() {
  window.location.href = "tel:832-572-7121";
}
function handleFindUsClick() {
  window.open(googleMapsBusinessLink, "_blank");
}
function handleReviewsClick() {
  window.open(googleReviewsUrl, "_blank");
}

function loadFeaturableScript() {
  return new Promise((resolve, reject) => {
    const oldScript = document.querySelector(
      'script[src^="https://featurable.com/assets/bundle.js"]'
    );
    if (oldScript) oldScript.remove();

    const script = document.createElement("script");
    script.src = `https://featurable.com/assets/bundle.js?reload=${Date.now()}`;
    script.defer = true;
    script.charset = "UTF-8";
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

async function initializeFeaturable() {
  if (!featurableContainer.value) return;
  featurableContainer.value.innerHTML = `
    <div id="featurable-41509530-5f33-499e-85c5-72c7e376bfc7" data-featurable-async></div>
  `;
  await loadFeaturableScript();
}

function serviceClick(subject) {
  router.push({ name: "contact-us", query: { subject } });
}

onMounted(async () => {
  initializeFeaturable();
});

onBeforeUnmount(() => {
  if (featurableContainer.value) featurableContainer.value.innerHTML = "";
});

// ✅ Add SEO Meta
useHead({
  title: "Auto Repair & Mechanic in Baytown, TX | St Ange Auto Service",
  meta: [
    {
      name: "description",
      content:
        "Looking for an auto repair shop in Baytown, TX? St Ange Auto Service offers professional car alignment, brake repair, A/C service, tires, and more. Call 832-572-7121!",
    },
  ],
});
</script>

<template>
  <PageLayout>
    <section class="index-page-container">
      <header
        class="title-container"
        :style="{
          backgroundImage: `url(/assets/mechanic-bg.webp)`,
          backgroundSize: 'cover',
        }"
      >
        <div
          class="flex flex-col justify-center items-center w-full gap-[40px] bg-[rgba(0,0,0,0.4)] p-[20px]"
        >
          <h1
            class="bg-black/20 rounded-[10px] w-full backdrop-blur-sm border border-white/10 text-center text-white text-[36px] md:text-[48px] font-bold leading-tight"
          >
            St Ange Auto Service<br />
            Baytown Car Repair & Mechanic
          </h1>

          <div class="call-to-action flex flex-wrap justify-center gap-4">
            <Badge
              text="Call us"
              icon="mdi:phone"
              iconWidth="24"
              iconHeight="24"
              :action="handleCallUsClick"
            />
            <Badge
              text="Find us"
              icon="mdi:location"
              iconWidth="24"
              iconHeight="24"
              :action="handleFindUsClick"
            />
            <Badge
              text="Reviews"
              icon="carbon:star-review"
              iconWidth="26"
              iconHeight="26"
              :action="handleReviewsClick"
            />
          </div>
        </div>
      </header>

      <section class="py-10 flex flex-col items-center">
        <h2 class="text-[40px] text-center font-bold mb-6">Our Services</h2>
        <div class="services">
          <ServiceCard
            image="/assets/car-alignment.webp"
            name="Car Alignment"
            @click="serviceClick('Car Alignment')"
            alt="Car Alignment"
          />
          <ServiceCard
            image="/assets/ac-repair.webp"
            name="A/C Repair"
            @click="serviceClick('A/C Repair')"
            alt="A/C Repair"
          />
          <ServiceCard
            image="/assets/brake-repair.webp"
            name="Brake Repair"
            @click="serviceClick('Brake Repair')"
            alt="Brake Repair"
          />
          <ServiceCard
            image="/assets/suspension-repair.webp"
            name="Suspension & Steering"
            @click="serviceClick('Suspension & Steering')"
            alt="Suspension & Steering"
          />
          <ServiceCard
            image="/assets/tires-repair.webp"
            name="New & Used Tires"
            @click="serviceClick('New & Used Tires')"
            alt="New & Used Tires"
          />
          <ServiceCard
            image="/assets/more-services.webp"
            name="And More..."
            @click="serviceClick('')"
            alt="More Services"
          />
        </div>
      </section>

      <GoogleMapsWidget />

      <section class="py-10">
        <h2 class="text-[40px] text-center font-bold mb-6">Customer Reviews</h2>
        <div ref="featurableContainer" class="google-reviews-widget"></div>
      </section>
    </section>
  </PageLayout>
</template>

<style src="@styles/pages/index.css"></style>
