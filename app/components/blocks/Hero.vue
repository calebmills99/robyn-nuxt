<script setup lang="ts">
const props = defineProps<{ blok: any }>()
const b = computed(() => props.blok)
// One poster URL for both the <img> and the <video poster> (no second download), at most
// 1920px wide and never upscaled past the photo's own width.
const poster = computed(() => sbImgCapped(b.value.background_image, 1920))
const LOGO_SIZES = '(max-width: 899px) calc(100vw - 72px), 650px'
const LAUREL_SIZES = '(max-width: 1023px) 100px, 205px'
// Style tab colours (heading over the video; background only shows with no photo/video).
const heroStyle = computed(() => { const v = colorVars(b.value); return Object.keys(v).length ? v : undefined })
const laurels = computed(() => (b.value.laurels || []).filter((a: any) => a?.filename))
// Laurels hosted on the Squarespace CDN have no size in their URL: read it on the server so each
// laurel gets width/height and the laurel rows (and the logo below) do not jump while loading.
const laurelSrc = (l: any) => sbImgCapped(l, 300)
const { data: laurelDims } = await useAsyncData(`laurel-dims:${b.value._uid || ''}`, () => probeDims(
  laurels.value.filter((l: any) => !sbDims(l)).map(laurelSrc).filter(u => /^https:\/\/images\.squarespace-cdn\.com\//.test(u)),
))
const laurelAttrs = (l: any) => sbDims(l) || laurelDims.value?.[laurelSrc(l)] || {}
</script>

<template>
  <section :class="['sb-hero', 'full-bleed-home', `sb-hero--${b.height || 'full'}`, ...colorClasses(b)]" v-bind="heroStyle ? { style: heroStyle } : {}">
    <div class="sb-hero__media" aria-hidden="true">
      <img v-if="poster" class="sb-hero__poster" :src="poster" v-bind="sbSizeAttrs(b.background_image)" alt="" fetchpriority="high">
      <SbVideo v-if="b.background_video" :video="b.background_video" :poster="poster" background title="" />
    </div>
    <div class="sb-hero__inner">
      <h1 v-if="b.title" :class="b.show_title ? 'sb-hero__title' : 'sr-only'">{{ b.title }}</h1>
      <div v-if="laurels.length" class="sb-hero__laurels" aria-label="Festival laurels">
        <img v-for="l in laurels" :key="l.filename" :src="laurelSrc(l)" :srcset="sbSrcsetW(l, [300, 500])" :sizes="LAUREL_SIZES" v-bind="laurelAttrs(l)" :alt="l.alt || ''" loading="lazy" fetchpriority="low">
      </div>
      <img v-if="b.logo?.filename" class="sb-hero__logo" :src="sbImgCapped(b.logo, 960)" :srcset="sbSrcsetW(b.logo, [480, 640, 960, 1280, 1920])" :sizes="LOGO_SIZES" v-bind="sbSizeAttrs(b.logo)" :alt="b.logo.alt || ''">
    </div>
  </section>
</template>
