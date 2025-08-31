<script setup>
import backgroundImg from "@assets/mechanic-bg.jpeg";

import alignmentImage from "@assets/car-alignment.png";
import acRepairImage from "@assets/ac-repair.png";
import brakeRepairImage from "@assets/brake-repair.png";
import suspensionRepairImage from "@assets/suspension-repair.png";
import tiresRepairImage from "@assets/tires-repair.png";
import moreServicesImage from "@assets/more-services.png";

import PageLayout from "@components/wrappers/PageLayout.vue";
import ServiceCard from "@components/ServiceCard.vue";
import Badge from "../components/particles/Badge.vue";
</script>

<template>
  <PageLayout>
    <div
      class="index-page-container"
      :style="{ backgroundImage: `url(${backgroundImg})` }"
    >
      <div class="title">CAR REPAIR & SERVICE</div>
      <div class="call-to-action">
        <Badge text="Call us" icon="mdi:phone" iconWidth="24" iconHeight="24" />
        <Badge
          text="Free Quote"
          icon="la:file-invoice-dollar"
          iconWidth="26"
          iconHeight="26"
        />
        <Badge
          text="Reviews"
          icon="carbon:star-review"
          iconWidth="26"
          iconHeight="26"
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
