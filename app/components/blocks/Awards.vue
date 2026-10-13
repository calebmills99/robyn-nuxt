<script setup lang="ts">
const props = defineProps<{ blok: any }>()
const b = computed(() => props.blok)
</script>

<template>
  <section :class="sectionClasses(b, 'sb-awards')" :style="sectionStyle(b)">
    <div class="sb-wrap">
      <p v-if="b.eyebrow" class="sb-eyebrow">{{ b.eyebrow }}</p>
      <h2 v-if="b.heading" class="sb-title sb-title--monument">{{ b.heading }}</h2>
      <p v-if="b.intro" class="sb-intro">{{ b.intro }}</p>
      <div class="pk-grid-3">
        <div v-for="l in b.items || []" :key="l._uid" class="laurel-card">
          <div style="display:flex;justify-content:space-between;align-items:center"><span class="badge">{{ l.badge || 'Award' }}</span><span class="laurel-card__meta">{{ l.year }}</span></div>
          <div class="laurel-card__award">{{ l.award }}</div>
          <div class="laurel-card__fest">{{ l.festival }}</div>
          <div v-if="l.meta" class="laurel-card__meta">{{ l.meta }}</div>
        </div>
      </div>
    </div>
  </section>
</template>
