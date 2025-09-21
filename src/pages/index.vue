<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";

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
import Badge from "@components/utilities/Badge.vue";

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
          backgroundImage: `url(${backgroundImg})`,
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
          :image="alignmentImage"
          name="Car Alignment"
          @click="serviceClick('Car Alignment')"
        />
        <ServiceCard
          :image="acRepairImage"
          name="A/C Repair"
          @click="serviceClick('A/C Repair')"
        />
        <ServiceCard
          :image="brakeRepairImage"
          name="Brake Repair"
          @click="serviceClick('Brake Repair')"
        />
        <ServiceCard
          :image="suspensionRepairImage"
          name="Suspension & Steering"
          @click="serviceClick('Suspension & Steering')"
        />
        <ServiceCard
          :image="tiresRepairImage"
          name="New & used tires"
          @click="serviceClick('New & used tires')"
        />
        <ServiceCard
          :image="moreServicesImage"
          name="And More..."
          @click="serviceClick('')"
        />
      </div>

      <div class="google-maps-widget">
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3464.2548993612645!2d-94.9661879244063!3d29.74133527507762!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x863f5d96d78f1689%3A0x9d76a9d056bdbd40!2sSt%20Ange%20Auto%20Service!5e0!3m2!1sen!2smt!4v1758451884017!5m2!1sen!2smt"
          :width="isMobile ? '350' : '600'"
          height="450"
          style="border: 0"
          allowfullscreen=""
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"
        ></iframe>
      </div>

      <div class="text-[40px] text-center font-bold">Our Happy Customers</div>

      <!-- Featurable Badge Widget -->
      <div ref="featurableContainer" class="google-reviews-widget"></div>
    </div>
  </PageLayout>
</template>

<style src="@styles/pages/index.css"></style>
