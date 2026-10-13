<script setup lang="ts">
/** Buttons an editor added. Watch buttons and gwingz.com links are dropped by rule (allowedLink). */
const props = defineProps<{ buttons?: any[], align?: string }>()
const items = computed(() => (props.buttons || [])
  .map(b => ({ blok: b, href: sbHref(b.link), label: String(b.label || '') }))
  .filter(b => b.label && allowedLink(b.label, b.href)))
</script>

<template>
  <div v-if="items.length" :class="['sb-buttons', align === 'center' ? 'sb-buttons--center' : '']">
    <a
      v-for="b in items"
      :key="b.blok._uid"
      :class="['sb-btn', `sb-btn--${b.blok.style || 'primary'}`]"
      :href="b.href"
      :download="b.blok.download ? (b.blok.download_filename || '') : undefined"
      :target="isExternal(b.href) ? '_blank' : undefined"
      :rel="isExternal(b.href) ? 'noopener' : undefined"
    >{{ b.label }}</a>
  </div>
</template>
