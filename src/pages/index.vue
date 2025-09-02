<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from "vue";
import { useDeviceType } from "@composables/useDeviceType";

import backgroundImg from "@assets/mechanic-bg.webp";
import alignmentImage from "@assets/car-alignment.webp";
import acRepairImage from "@assets/ac-repair.webp";
import brakeRepairImage from "@assets/brake-repair.webp";
import suspensionRepairImage from "@assets/suspension-repair.webp";
import tiresRepairImage from "@assets/tires-repair.webp";
import moreServicesImage from "@assets/more-services.webp";

import PageLayout from "@components/wrappers/PageLayout.vue";
import ServiceCard from "@components/ServiceCard.vue";
import Badge from "../components/utilities/Badge.vue";

const { isMobile } = useDeviceType();
const featurableContainer = ref(null);

const googleReviewsUrl =
  "https://search.google.com/local/reviews?placeid=ChIJiRaP15ZdP4YRQL29VtCpdp0";

function handleReviewsClick() {
  console.log("REVIEWS");
  window.open(googleReviewsUrl, "_blank");
}
function handleCallUsClick() {
  console.log("Click");
  window.location.href = "tel:832-572-7121";
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
    <div
      class="index-page-container"
      :style="{ backgroundImage: `url(${backgroundImg})` }"
    >
      <div class="title">CAR REPAIR & SERVICE</div>
      <div class="call-to-action">
        <Badge
          text="Call us"
          icon="mdi:phone"
          iconWidth="24"
          iconHeight="24"
          :action="isMobile ? handleCallUsClick : null"
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
      <div class="services">
        <ServiceCard :image="alignmentImage" name="Car Alignment" />
        <ServiceCard :image="acRepairImage" name="A/C Repair" />
        <ServiceCard :image="brakeRepairImage" name="Brake Repair" />
        <ServiceCard
          :image="suspensionRepairImage"
          name="Suspension & Steering"
        />
        <ServiceCard :image="tiresRepairImage" name="New & Old tires" />
        <ServiceCard :image="moreServicesImage" name="And More..." />
      </div>
      <!-- Featurable Badge Widget -->
      <div ref="featurableContainer" class="google-reviews-widget"></div>
    </div>
  </PageLayout>
</template>

<style src="@styles/pages/index.css"></style>
