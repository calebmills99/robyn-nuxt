<script setup lang="ts">
const props = defineProps<{ blok: any }>()
const b = computed(() => props.blok)
const poster = computed(() => sbImg(b.value.poster, 960))
const hasBody = computed(() => !richTextIsEmpty(b.value.body))
</script>

<template>
  <section :class="sectionClasses(b, 'sb-videoblock')" :style="sectionStyle(b)">
    <div :class="['sb-wrap', b.layout === 'side' && hasBody ? 'sb-split' : 'sb-stack']">
      <div v-if="b.layout === 'side' && hasBody" class="sb-split__copy">
        <SbRichText :doc="b.body" />
      </div>
      <div class="sb-videoblock__media">
        <h2 v-if="b.heading && b.layout === 'side'" class="sb-title sb-title--monument sb-videoblock__label">{{ b.heading }}</h2>
        <SbVideo :video="b.video" :poster="poster" :autoplay="!!b.autoplay" :title="b.heading || 'Golden Wings video'" />
      </div>
      <div v-if="b.layout !== 'side'" class="sb-stack__copy">
        <h2 v-if="b.heading" class="sb-title sb-title--monument">{{ b.heading }}</h2>
        <SbRichText :doc="b.body" />
      </div>
    </div>
  </section>
</template>
