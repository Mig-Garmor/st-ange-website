<script setup>
import { Icon } from "@iconify/vue";

import logo from "@assets/logo-2.png";
</script>

<template>
  <div class="header-container">
    <div class="logo-container">
      <img :src="logo" />
    </div>
    <div class="information-container">
      <div class="phone-number">
        <Icon
          icon="mdi:phone"
          width="24"
          height="24"
          color="#011F7C"
        />832-572-7121
      </div>
      <div class="location">
        <Icon icon="mdi:location" width="24" height="24" color="#011F7C" />1300
        N Main St, Baytown
      </div>
    </div>
    <div class="links-container">
      <div>Home</div>
      <div>About</div>
    </div>
  </div>
</template>

<style src="@styles/components/wrappers/page-header.css"></style>
