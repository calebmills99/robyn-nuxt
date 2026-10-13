<script setup lang="ts">
const props = defineProps<{ blok: any }>()
const b = computed(() => props.blok)
const href = computed(() => {
  const h = sbHref(b.value.image_link)
  return h && allowedLink('', h) ? h : ''
})
// An image link with no alt text takes its accessible name from the first (shown) button label.
const linkLabel = computed(() => {
  if (!href.value || String(b.value.image?.alt || '').trim()) return undefined
  const first = (b.value.buttons || []).map((x: any) => ({ label: String(x?.label || ''), href: sbHref(x?.link) }))
    .find((x: any) => x.label && allowedLink(x.label, x.href))
  return first?.label || undefined
})
</script>

<template>
  <section :class="sectionClasses(b, 'sb-buttonrow')" :style="sectionStyle(b)">
    <div :class="['sb-wrap', b.align === 'left' ? '' : 'sb-wrap--center']">
      <h2 v-if="b.heading" class="sb-title sb-title--monument">{{ b.heading }}</h2>
      <component :is="href ? 'a' : 'div'" v-if="b.image?.filename" :href="href || undefined" :aria-label="linkLabel" class="sb-buttonrow__media">
        <img :src="sbImgCapped(b.image, 300)" :srcset="sbSrcsetW(b.image, [300, 480, 600])" sizes="(max-width: 390px) 70vw, 273px" v-bind="sbSizeAttrs(b.image)" :alt="b.image.alt || ''" loading="lazy">
      </component>
      <SbButtons :buttons="b.buttons" :align="b.align === 'left' ? 'left' : 'center'" />
    </div>
  </section>
</template>
