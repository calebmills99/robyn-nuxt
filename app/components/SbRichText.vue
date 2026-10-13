<script setup lang="ts">
const props = defineProps<{ doc: any, tag?: string }>()
const html = computed(() => richTextHtml(props.doc))
// A render function keeps innerHTML in both server and client output.
const RichText = () => html.value ? h(props.tag || 'div', { class: 'sb-rt', innerHTML: html.value }) : null
</script>

<template>
  <RichText />
</template>
