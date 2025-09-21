<script setup>
import { useDeviceType } from "@composables/useDeviceType";

const { isMobile } = useDeviceType();
</script>

<template>
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
</template>

<style src="@styles/components/blocks/google-maps-widget.css"></style>
