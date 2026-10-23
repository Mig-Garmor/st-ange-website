<script setup>
import Badge from "@components/utilities/Badge.vue";
import { business } from "@/config/business";

defineProps({
  title: { type: String, default: "Need a mechanic in Baytown?" },
  text: {
    type: String,
    default: "Call us to describe the problem or book a time to bring your car in.",
  },
  subject: { type: String, default: "" },
});
</script>

<template>
  <section class="cta-band">
    <h2>{{ title }}</h2>
    <p>{{ text }}</p>
    <div class="cta-actions">
      <Badge :text="`Call ${business.phone.display}`" icon="mdi:phone" :href="business.phone.href" />
      <Badge
        text="Request service"
        icon="mdi:calendar-check"
        :to="subject ? { path: '/contact-us', query: { subject } } : '/contact-us'"
        class="badge-outline"
      />
    </div>
  </section>
</template>

<style scoped>
.cta-band {
  @apply flex flex-col items-center gap-4 w-full px-[20px] py-[48px] text-center bg-brand-navy text-white;
}
h2 {
  @apply text-[28px] md:text-[36px] font-bold leading-tight;
}
p {
  @apply max-w-2xl text-[17px] text-white/85;
}
.cta-actions {
  @apply flex flex-wrap justify-center gap-4 mt-2;
}
.badge-outline {
  @apply bg-transparent text-white border-2 border-brand-yellow;
}
</style>
