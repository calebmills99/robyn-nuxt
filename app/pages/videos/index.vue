<script setup lang="ts">
/**
 * /videos: every PUBLISHED local video (content/studio/videos), newest upload first, each
 * linking to its own page. Empty until a video is published (and noindex while empty).
 * Ends with the one gwingz.com band.
 */
const { data, error } = await useAsyncData('videos-index', () => $fetch<{ videos: any[] }>('/api/content/videos'))
if (error.value) throw createError({ statusCode: 503, statusMessage: 'Videos unavailable', fatal: true })
const videos = computed(() => (data.value?.videos || []).filter((v: any) => v.title))

useSeoPage({
  title: 'Videos',
  path: '/videos',
  jsonLd: collectionPageJsonLd({
    name: 'Videos',
    description: DEFAULT_DESCRIPTION,
    url: '/videos',
    items: videos.value.map((v: any) => ({ name: v.title, url: v.path, description: v.description || undefined })),
  }),
})
if (!videos.value.length) useHead({ meta: [{ name: 'robots', content: 'noindex' }] })
</script>

<template>
  <div class="sb-page sb-page--videos">
    <section class="sb-section sb-theme--light vid-index">
      <div class="sb-wrap">
        <h1 class="sb-title sb-title--monument">Videos</h1>
        <ul v-if="videos.length" class="vid-grid">
          <li v-for="(v, i) in videos" :key="v.slug" class="vid-card">
            <a :href="v.path" class="vid-card__link">
              <img
                v-if="v.thumbnail"
                class="vid-card__img"
                :src="v.thumbnail.replace(/height=\d+/, 'height=360')"
                :alt="v.title"
                width="640"
                height="360"
                :loading="i < 3 ? 'eager' : 'lazy'"
                decoding="async"
              >
              <h2 class="vid-card__title">{{ v.title }}</h2>
            </a>
          </li>
        </ul>
      </div>
    </section>
    <GwingzBand page="videos" />
  </div>
</template>

<style scoped>
/* Short pages: the light section grows so the band sits right on the footer (main has a min-height). */
.sb-page { display: flex; flex-direction: column; min-height: inherit; }
.vid-index { flex: 1 0 auto; }
.vid-grid { list-style: none; margin: 2rem 0 0; padding: 0; display: grid; gap: 2rem; grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr)); }
.vid-card__link { display: block; color: inherit; text-decoration: none; }
.vid-card__img { display: block; width: 100%; height: auto; aspect-ratio: 16 / 9; object-fit: cover; background: #000; }
.vid-card__title { margin: 0.75rem 0 0; font-size: 1.1rem; line-height: 1.3; }
.vid-card__link:hover .vid-card__title, .vid-card__link:focus-visible .vid-card__title { text-decoration: underline; }
</style>
