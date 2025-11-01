<script setup>
import PageLayout from "@components//wrappers/PageLayout.vue";
import GoogleMapsWidget from "@components/blocks/GoogleMapsWidget.vue";
import ImageTextBlock from "../components/blocks/ImageTextBlock.vue";
</script>

<template>
  <PageLayout>
    <div class="about-us-page-container">
      <div class="text-container">
        <h1>Our Story</h1>
        <ImageTextBlock
          image="assets/st-lucia-family.webp"
          text="We're a proud family-owned St. Lucian mechanic shop right here in
        Baytown, Texas."
        />
        <ImageTextBlock
          image="/assets/working-with-uncle.webp"
          text="   What began around 30 years ago with our owner fixing his dad’s car and
        running a mobile mechanic business from his truck has grown into a
        trusted local shop with 5-star reviews on Google."
        />
        <ImageTextBlock
          image="/assets/satisfied-customers.webp"
          text="At our shop, customer satisfaction is our number one priority.
"
        />
        <ImageTextBlock
          image="/assets/more-services.webp"
          text="We specialize in alignments, brakes, wheels, suspension, steering, regular service checks, and more, with a commitment to quality work you can rely on."
        />
        <ImageTextBlock
          image="/assets/customer-deal.webp"
          text="Every customer is treated like family, and we go the extra mile to make sure you drive away with confidence."
        />
      </div>
      <GoogleMapsWidget />
    </div>
  </PageLayout>
</template>

<style src="@styles/pages/about.css"></style>
