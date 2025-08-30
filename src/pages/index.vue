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
</script>

<template>
  <PageLayout>
    <div
      class="index-page-container"
      :style="{ backgroundImage: `url(${backgroundImg})` }"
    >
      <div class="title">CAR REPAIR & SERVICE</div>
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
    </div>
  </PageLayout>
</template>

<style src="@styles/pages/index.css"></style>
