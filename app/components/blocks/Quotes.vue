<script setup lang="ts">
const props = defineProps<{ blok: any }>()
const b = computed(() => props.blok)
</script>

<template>
  <section :class="[...sectionClasses({ theme: 'slate', ...b }, 'sb-quotes'), 'full-bleed-home']" :style="sectionStyle(b)">
    <div class="sb-wrap">
      <p v-if="b.eyebrow" class="sb-eyebrow">{{ b.eyebrow }}</p>
      <h2 v-if="b.heading" class="sb-title sb-title--monument">{{ b.heading }}</h2>
      <div class="sb-quotes__list">
        <blockquote v-for="q in b.items || []" :key="q._uid" class="quote">
          <div><p>{{ q.text }}</p><footer>{{ q.by }}</footer></div>
        </blockquote>
      </div>
    </div>
  </section>
</template>
