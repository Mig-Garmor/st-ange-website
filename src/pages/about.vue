<script setup>
import PageLayout from "@components//wrappers/PageLayout.vue";
import GoogleMapsWidget from "@components/blocks/GoogleMapsWidget.vue";
</script>

<template>
  <PageLayout>
    <div class="about-us-page-container">
      <div class="text-container">
        We’re a proud family-owned St. Lucian mechanic shop right here in
        Baytown, Texas.
        <br />
        <br />
        What began around 30 years ago with our owner fixing his dad’s car and
        running a mobile mechanic business from his truck has grown into a
        trusted local shop with 5-star reviews on Google.
        <br />
        <br />
        At our shop, customer satisfaction is our number one priority. We
        specialize in alignments, brakes, wheels, suspension, steering, regular
        service checks, and more, with a commitment to quality work you can rely
        on. Every customer is treated like family, and we go the extra mile to
        make sure you drive away with confidence.
      </div>
      <GoogleMapsWidget />
    </div>
  </PageLayout>
</template>

<style src="@styles/pages/about.css"></style>
