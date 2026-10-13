<script setup lang="ts">
const props = defineProps<{ blok: any }>()
const b = computed(() => props.blok)
const open = ref(false)
const collapsible = computed(() => !!b.value.collapse_label && !richTextIsEmpty(b.value.body))
const hasAside = computed(() => !richTextIsEmpty(b.value.aside))
const badges = computed(() => badgeList(b.value.badges))
const Tag = computed(() => (b.value.heading_level === 'h1' ? 'h1' : 'h2'))
</script>

<template>
  <section :class="sectionClasses(b, 'sb-text')" :style="sectionStyle(b)">
    <div :class="['sb-wrap', b.align === 'center' ? 'sb-wrap--center' : '', hasAside ? 'sb-grid-2' : '']">
      <div>
        <p v-if="b.eyebrow" class="sb-eyebrow">{{ b.eyebrow }}</p>
        <component :is="Tag" v-if="b.heading" :class="['sb-title', `sb-title--${b.heading_style || 'monument'}`]">{{ b.heading }}</component>
        <div v-if="collapsible" :class="['sb-collapse', { 'is-open': open }]">
          <SbRichText :doc="b.body" />
        </div>
        <SbRichText v-else :doc="b.body" />
        <p v-if="badges.length" class="sb-badges">
          <span v-for="(x, i) in badges" :key="x" :class="['badge', { 'badge--outline': i > 0 }]">{{ x }}</span>
        </p>
        <div v-if="collapsible && !open" class="sb-buttons" :class="b.align === 'center' ? 'sb-buttons--center' : ''">
          <button type="button" class="sb-btn sb-btn--plain" @click="open = true">{{ b.collapse_label }}</button>
        </div>
        <SbButtons :buttons="b.buttons" :align="b.align" />
      </div>
      <SbRichText v-if="hasAside" :doc="b.aside" />
    </div>
  </section>
</template>
