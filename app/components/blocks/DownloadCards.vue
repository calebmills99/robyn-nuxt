<script setup lang="ts">
const props = defineProps<{ blok: any }>()
const b = computed(() => props.blok)
const items = computed(() => (b.value.items || []).map((d: any) => ({ d, href: sbHref(d.link) })).filter((x: any) => allowedLink(x.d.cta || '', x.href)))
</script>

<template>
  <section :class="sectionClasses(b, 'sb-downloads')" :style="sectionStyle(b)">
    <div class="sb-wrap">
      <p v-if="b.eyebrow" class="sb-eyebrow">{{ b.eyebrow }}</p>
      <h2 v-if="b.heading" class="sb-title sb-title--monument">{{ b.heading }}</h2>
      <div class="pk-grid-3">
        <div v-for="x in items" :key="x.d._uid" class="dl-card">
          <p class="section__label">{{ x.d.label }}</p>
          <div class="dl-card__title">{{ x.d.title }}</div>
          <p class="dl-card__note">{{ x.d.note }}</p>
          <a :class="['btn', x.d.style === 'ghost' ? 'btn--ghost' : 'btn--primary']" :href="x.href" :download="x.d.download ? '' : undefined">{{ x.d.cta }}</a>
        </div>
      </div>
    </div>
  </section>
</template>
