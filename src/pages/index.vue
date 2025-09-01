<script setup>
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

function handleReviewsClick() {
  const googleMapsUrl =
    "https://search.google.com/local/reviews?placeid=ChIJiRaP15ZdP4YRQL29VtCpdp0";
  window.open(googleMapsUrl, "_blank");
}
function handleCallNowClick() {
  window.location.href = "tel:832-572-7121";
}
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
          :action="isMobile ? handleCallNowClick : null"
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
      <div class="reviews bg-black text-white p-[10px]">
        GOOGLE MAPS REVIEWS
      </div>
    </div>
  </PageLayout>
</template>

<style src="@styles/pages/index.css"></style>
