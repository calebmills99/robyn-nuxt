<script setup lang="ts">
const props = defineProps<{ blok: any }>()
const b = computed(() => props.blok)
</script>

<template>
  <section :class="sectionClasses(b, 'sb-credits')" :style="sectionStyle(b)">
    <div class="sb-wrap">
      <p v-if="b.eyebrow" class="sb-eyebrow">{{ b.eyebrow }}</p>
      <h2 v-if="b.heading" class="sb-title sb-title--monument">{{ b.heading }}</h2>
      <div class="pk-grid-2">
        <div class="sb-rt">
          <p v-for="s in b.people || []" :key="s._uid">
            <strong>{{ s.name }}</strong><template v-if="s.badge"> <span class="badge">{{ s.badge }}</span></template><br>{{ s.text }}
          </p>
        </div>
        <div>
          <div v-for="r in b.crew || []" :key="r._uid" class="crew-row"><span>{{ r.role }}</span><span>{{ r.name }}</span></div>
        </div>
      </div>
    </div>
  </section>
</template>
