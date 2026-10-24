<script setup>
import { business } from "@/config/business";
</script>

<template>
  <div class="google-maps-widget">
    <iframe
      :src="business.mapEmbedUrl"
      :title="`Map showing ${business.name} in Baytown, TX`"
      allowfullscreen
      loading="lazy"
      referrerpolicy="no-referrer-when-downgrade"
    ></iframe>
  </div>
</template>

<style src="@styles/components/blocks/google-maps-widget.css"></style>
