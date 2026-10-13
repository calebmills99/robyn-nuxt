<script setup lang="ts">
const route = useRoute()
const chrome = await useSiteCopy('chrome')
const isHome = computed(() => route.path === '/')
// Block-content pages draw their own full-bleed sections.
const isBlockPage = computed(() => PAGE_ROUTES.includes(route.path.replace(/\/+$/, '') || '/') || isVideoPath(route.path))
</script>

<template>
  <div class="site-shell">
    <a class="sr-only" href="#main">Skip to content</a>
    <SiteHeader :chrome="chrome" />
    <main id="main" :class="['site-main', { 'site-main--home': isHome && !isBlockPage, 'site-main--sb': isBlockPage }]">
      <slot />
    </main>
    <SiteFooter :chrome="chrome" />
  </div>
</template>
