<script setup lang="ts">
const props = defineProps<{ blok: any }>()
const b = computed(() => props.blok)
// Style tab colours only; the attribute is left off entirely when none is set.
const colorStyle = computed(() => sectionStyle({ ...b.value, background_image: null }))
</script>

<template>
  <section :class="[...sectionClasses(b, 'sb-imageband'), 'full-bleed-home', `sb-imageband--${b.height || 'natural'}`, `sb-imageband--${b.fit || 'cover'}`]" v-bind="colorStyle ? { style: colorStyle } : {}">
    <img v-if="b.image?.filename" :src="sbImgCapped(b.image, 1280, 1920)" :srcset="sbSrcsetW(b.image, [640, 960, 1280, 1920])" sizes="100vw" v-bind="sbSizeAttrs(b.image)" :alt="b.image.alt || ''" loading="lazy">
  </section>
</template>
