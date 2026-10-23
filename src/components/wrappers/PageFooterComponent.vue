<script setup>
import IconText from "@components/utilities/IconText.vue";
import { business, fullAddress } from "@/config/business";
import { navLinks } from "@/config/navigation";

const year = new Date().getFullYear();
</script>

<template>
  <footer class="page-footer-component">
    <div class="footer-columns">
      <div class="footer-column">
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

      <div class="footer-column">
        <p class="footer-heading">Hours</p>
        <dl class="footer-hours">
          <template v-for="slot in business.hours" :key="slot.label">
            <dt>{{ slot.label }}</dt>
            <dd>{{ slot.display }}</dd>
          </template>
        </dl>
      </div>

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
