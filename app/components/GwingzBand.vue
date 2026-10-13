<script setup lang="ts">
/**
 * The one gwingz.com invitation per page. Rendered by SbPage after the editable blocks, never
 * by a block, so an editor cannot remove it, move it up the page, or add a second one.
 * Heading and button text come from local Studio site settings (band_heading,
 * band_button_text); the link, UTM params and placement stay in code.
 * Empty or unreachable settings fall back to the [CALEB WRITES] placeholder.
 */
const props = defineProps<{ page: string }>()
const href = computed(() => watchUrl(`${props.page}-band`))
const PLACEHOLDER = '[CALEB WRITES]'
const { data: settings } = await useAsyncData('local-site-settings', () =>
  $fetch<any>('/api/content/settings'))
const heading = computed(() => String(settings.value?.band_heading || '').trim() || PLACEHOLDER)
const button = computed(() => String(settings.value?.band_button_text || '').trim() || PLACEHOLDER)
</script>

<template>
  <section data-content-id="siteSettings/studio/settings/site.json" class="gw-band full-bleed-home" data-offer="gwingz.com" aria-labelledby="gw-band-heading">
    <div class="gw-band__inner">
      <h2 id="gw-band-heading" class="gw-band__title">{{ heading }}</h2>
      <a class="sb-btn sb-btn--primary gw-band__btn" :href="href" rel="noopener">{{ button }}</a>
    </div>
  </section>
</template>
