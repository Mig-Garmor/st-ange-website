<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";

import { useDeviceType } from "@composables/useDeviceType";

import PageLayout from "@components/wrappers/PageLayout.vue";
import ServiceCard from "@components/ServiceCard.vue";
import Badge from "@components/utilities/Badge.vue";
import GoogleMapsWidget from "../components/blocks/GoogleMapsWidget.vue";

const router = useRouter();

const { isMobile } = useDeviceType();

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
    // Remove any existing Featurable script
    const oldScript = document.querySelector(
      'script[src^="https://featurable.com/assets/bundle.js"]'
    );
    if (oldScript) {
      oldScript.remove();
    }

    const script = document.createElement("script");
    script.src = `https://featurable.com/assets/bundle.js?reload=${Date.now()}`; // bust cache
    script.defer = true;
    script.charset = "UTF-8";
    script.onload = () => {
      console.log("✅ Featurable script reloaded");
      resolve();
    };
    script.onerror = () => {
      console.error("❌ Failed to load Featurable script");
      reject();
    };
    document.body.appendChild(script);
  });
}

async function initializeFeaturable() {
  if (!featurableContainer.value) return;

  // Completely clear and recreate the container
  featurableContainer.value.innerHTML = `
    <div id="featurable-41509530-5f33-499e-85c5-72c7e376bfc7" data-featurable-async></div>
  `;

  // Load script fresh every time
  await loadFeaturableScript();
}

function serviceClick(subject) {
  if (subject !== "" && subject !== undefined)
    router.push({ name: "contact-us", query: { subject: subject } });
  else router.push({ name: "contact-us" });
}

onMounted(async () => {
  initializeFeaturable();
});

onBeforeUnmount(() => {
  // Optional cleanup
  if (featurableContainer.value) {
    featurableContainer.value.innerHTML = "";
  }
});
</script>

<template>
  <PageLayout>
    <div class="index-page-container">
      <div
        class="title-container"
        :style="{
          backgroundImage: `url(/assets/mechanic-bg.webp)`,
          backgroundSize: 'cover',
        }"
      >
        <div
          class="flex flex-col justify-center items-center w-full gap-[40px] bg-[rgba(0,0,0,0.4)] p-[20px]"
        >
          <div class="title">
            <div
              class="bg-black/20 rounded-[10px] w-full backdrop-blur-sm border border-white/10"
            >
              <p>
                Baytown <br />
                Car Repair & Service
              </p>
            </div>
          </div>
          <div class="call-to-action">
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
            <!-- <Badge
          text="Free Quote"
          icon="la:file-invoice-dollar"
          iconWidth="26"
          iconHeight="26"
        /> -->
            <Badge
              text="Reviews"
              icon="carbon:star-review"
              iconWidth="26"
              iconHeight="26"
              :action="handleReviewsClick"
            />
          </div>
        </div>
      </div>
      <div class="text-[40px] text-center font-bold">Our Services</div>
      <div class="services">
        <ServiceCard
          image="/assets/car-alignment.webp"
          name="Car Alignment"
          @click="serviceClick('Car Alignment')"
        />
        <ServiceCard
          image="/assets/ac-repair.webp"
          name="A/C Repair"
          @click="serviceClick('A/C Repair')"
        />
        <ServiceCard
          image="/assets/brake-repair.webp"
          name="Brake Repair"
          @click="serviceClick('Brake Repair')"
        />
        <ServiceCard
          image="/assets/suspension-repair.webp"
          name="Suspension & Steering"
          @click="serviceClick('Suspension & Steering')"
        />
        <ServiceCard
          image="/assets/tires-repair.webp"
          name="New & used tires"
          @click="serviceClick('New & used tires')"
        />
        <ServiceCard
          image="/assets/more-services.webp"
          name="And More..."
          @click="serviceClick('')"
        />
      </div>

      <GoogleMapsWidget />

      <div class="text-[40px] text-center font-bold">Customers Reviews</div>

      <!-- Featurable Badge Widget -->
      <div ref="featurableContainer" class="google-reviews-widget"></div>
    </div>
  </PageLayout>
</template>

<style src="@styles/pages/index.css"></style>
