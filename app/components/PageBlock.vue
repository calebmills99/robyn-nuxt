<script setup lang="ts">
/** One page section from local content (content/studio/pages/*.json), picked by its `component` name. */
import type { Component } from 'vue'
import Awards from './blocks/Awards.vue'
import ButtonRow from './blocks/ButtonRow.vue'
import Credits from './blocks/Credits.vue'
import DownloadCards from './blocks/DownloadCards.vue'
import Gallery from './blocks/Gallery.vue'
import Hero from './blocks/Hero.vue'
import ImageBand from './blocks/ImageBand.vue'
import ImageText from './blocks/ImageText.vue'
import Quotes from './blocks/Quotes.vue'
import TextSection from './blocks/TextSection.vue'
import VideoEmbed from './blocks/VideoEmbed.vue'

const BLOCKS: Record<string, Component> = {
  'awards': Awards,
  'button-row': ButtonRow,
  'credits': Credits,
  'download-cards': DownloadCards,
  'gallery': Gallery,
  'hero': Hero,
  'image-band': ImageBand,
  'image-text': ImageText,
  'quotes': Quotes,
  'text-section': TextSection,
  'video-embed': VideoEmbed,
}

const props = defineProps<{ blok: any }>()
const block = computed(() => BLOCKS[props.blok?.component])
if (import.meta.dev && !block.value) console.warn(`[PageBlock] no component for "${props.blok?.component}"`)
</script>

<template>
  <component :is="block" v-if="block" :blok="blok" />
</template>
