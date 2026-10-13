<script setup lang="ts">
const props = defineProps<{ blok: any }>()
const b = computed(() => props.blok)
const href = computed(() => {
  const h = sbHref(b.value.image_link)
  return h && allowedLink('', h) ? h : ''
})
</script>

<template>
  <section :class="sectionClasses(b, 'sb-imagetext')" :style="sectionStyle(b)">
    <div :class="['sb-wrap', 'sb-split', b.image_side === 'left' ? 'sb-split--img-left' : '']">
      <div class="sb-split__copy">
        <p v-if="b.eyebrow" class="sb-eyebrow">{{ b.eyebrow }}</p>
        <h2 v-if="b.heading" class="sb-title sb-title--monument">{{ b.heading }}</h2>
        <SbRichText :doc="b.body" />
        <SbButtons :buttons="b.buttons" />
      </div>
      <figure v-if="b.image?.filename" :class="['sb-split__media', { 'has-inset': b.inset_image?.filename }]">
        <component :is="href ? 'a' : 'div'" :href="href || undefined" class="sb-split__frame">
          <img :src="sbImgCapped(b.image, 720)" :srcset="sbSrcsetW(b.image, [480, 720, 960, 1440])" sizes="(max-width: 1023px) calc(100vw - 40px), 540px" v-bind="sbSizeAttrs(b.image)" :alt="b.image.alt || ''" loading="lazy">
        </component>
        <img v-if="b.inset_image?.filename" class="sb-split__inset" :src="sbImgCapped(b.inset_image, 320)" :srcset="sbSrcsetW(b.inset_image, [240, 320, 480, 640])" sizes="(max-width: 1023px) 36vw, 205px" v-bind="sbSizeAttrs(b.inset_image)" :alt="b.inset_image.alt || ''" loading="lazy">
        <figcaption v-if="b.image.title" class="sb-caption">{{ b.image.title }}</figcaption>
      </figure>
    </div>
  </section>
</template>
