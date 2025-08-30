<script setup>
import { ref, watchEffect } from "vue";

const props = defineProps({
  iconName: {
    type: String,
    required: true,
  },
});

// The icon you want to load dynamically

// The loaded SVG component
const iconComponent = ref(null);

// Glob all SVGs under src/assets
const svgModules = import.meta.glob("@assets/**/*.svg");

watchEffect(async () => {
  if (!props.iconName) return;

  // Build the correct relative path (must match the keys in svgModules)
  const path = `/assets/svgs/${props.iconName}.svg`;
  console.log(svgModules);

  const loader = svgModules[path];

  if (!loader) {
    console.error(`SVG not found: ${path}`);
    iconComponent.value = null;
    return;
  }

  // Call the loader function and get the default export
  const module = await loader();
  iconComponent.value = module.default;
});
</script>

<template>
  <component :is="iconComponent" v-if="iconComponent" />
</template>
