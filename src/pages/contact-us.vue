<script setup>
import PageLayout from "@components//wrappers/PageLayout.vue";
import ContactUsFormComponent from "@components/forms/ContactUsFormComponent.vue";
</script>

<template>
  <PageLayout>
    <div
      class="flex justify-center items-center w-full p-[20px] mb-[20px] text-[40px] font-bold"
    >
      Send us an email
    </div>
    <div><ContactUsFormComponent /></div>
  </PageLayout>
</template>

<style src="@styles/pages/contact-us.css"></style>
