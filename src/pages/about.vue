<script setup>
import stLuciaFamily from "@assets/st-lucia-family.webp";
import workingWithUncle from "@assets/working-with-uncle.webp";
import satisfiedCustomers from "@assets/satisfied-customers.webp";
import customerDeal from "@assets/customer-deal.webp";
import moreServices from "@assets/more-services.webp";

import PageLayout from "@components//wrappers/PageLayout.vue";
import GoogleMapsWidget from "@components/blocks/GoogleMapsWidget.vue";
import ImageContainer from "../components/blocks/ImageContainer.vue";
import ImageTextBlock from "../components/blocks/ImageTextBlock.vue";
</script>

<template>
  <PageLayout>
    <div class="about-us-page-container">
      <div class="text-container">
        <ImageTextBlock
          :image="stLuciaFamily"
          text="We're a proud family-owned St. Lucian mechanic shop right here in
        Baytown, Texas."
        />
        <ImageTextBlock
          :image="workingWithUncle"
          text="   What began around 30 years ago with our owner fixing his dad’s car and
        running a mobile mechanic business from his truck has grown into a
        trusted local shop with 5-star reviews on Google."
        />
        <ImageTextBlock
          :image="satisfiedCustomers"
          text="        At our shop, customer satisfaction is our number one priority.
"
        />
        <ImageTextBlock
          :image="moreServices"
          text="We specialize in alignments, brakes, wheels, suspension, steering, regular service checks, and more, with a commitment to quality work you can rely on."
        />
        <ImageTextBlock
          :image="customerDeal"
          text="Every customer is treated like family, and we go the extra mile to make sure you drive away with confidence."
        />
      </div>
      <GoogleMapsWidget />
    </div>
  </PageLayout>
</template>

<style src="@styles/pages/about.css"></style>
