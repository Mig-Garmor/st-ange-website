<script setup>
import IconText from "@components/utilities/IconText.vue";
import HoursList from "@components/utilities/HoursList.vue";
import { business, fullAddress, services } from "@/config/business";
import { navLinks } from "@/config/navigation";

const year = new Date().getFullYear();
</script>

<template>
  <footer class="page-footer-component">
    <div class="footer-columns">
      <div class="footer-column footer-column-wide">
        <p class="footer-heading">{{ business.name }}</p>
        <IconText
          icon="mdi:location"
          :text="fullAddress"
          :href="business.links.maps"
          external
          :icon-size="18"
        />
        <IconText
          icon="mdi:phone"
          :text="business.phone.display"
          :href="business.phone.href"
          :icon-size="18"
        />
      </div>

      <div class="footer-column footer-column-wide">
        <p class="footer-heading">Hours</p>
        <HoursList />
      </div>

      <nav class="footer-column" aria-label="Services">
        <p class="footer-heading">Services</p>
        <RouterLink
          v-for="service in services"
          :key="service.slug"
          :to="`/services/${service.slug}`"
        >
          {{ service.name }}
        </RouterLink>
      </nav>

      <nav class="footer-column" aria-label="Footer">
        <p class="footer-heading">Pages</p>
        <RouterLink v-for="link in navLinks" :key="link.to" :to="link.to">
          {{ link.label }}
        </RouterLink>
      </nav>
    </div>

    <p class="footer-copyright">
      © {{ year }} {{ business.name }}. All rights reserved.
    </p>
  </footer>
</template>

<style src="@styles/components/wrappers/page-footer.css"></style>
