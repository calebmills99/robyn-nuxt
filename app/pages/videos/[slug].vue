<script setup lang="ts">
/**
 * One video (local entry content/studio/videos/<slug>.json): the player is the main
 * content at the top, then title, description, transcript and credits, then the one gwingz.com band.
 * Published entries only on the public site (unpublished = 404); development shows drafts.
 */
const route = useRoute()
const slug = String(route.params.slug || '')

const { data, error } = await useAsyncData(`video-${slug}`, () =>
  $fetch<{ story: any, info: any, draft: boolean }>('/api/content/video', { query: { slug } }))
const status = error.value?.statusCode
if (status && status !== 404) throw createError({ statusCode: status, statusMessage: 'Video unavailable', fatal: true })
const notFound = !data.value?.story
if (notFound && import.meta.server) setResponseStatus(useRequestEvent()!, 404)
const nf = useAppConfig().siteNotFound as any

const story = computed<any>(() => data.value?.story || null)
const c = computed(() => story.value?.content || {})
const uid = computed(() => streamIdFrom(c.value.stream_id))
const title = computed(() => String(c.value.title || '').trim())
const paragraphs = computed(() => String(c.value.description || '').trim().split(/\n\s*\n/).map(p => p.trim()).filter(Boolean))
const thumb = computed(() => videoThumb(c.value))
const player = computed(() => {
  if (!uid.value) return ''
  const q = new URLSearchParams({ preload: 'metadata' })
  if (thumb.value) q.set('poster', thumb.value)
  return `https://${STREAM_CUSTOMER}.cloudflarestream.com/${uid.value}/iframe?${q.toString()}`
})
const hasTranscript = computed(() => !richTextIsEmpty(c.value.transcript))
const hasCredits = computed(() => !richTextIsEmpty(c.value.credits))

if (notFound) {
  useSeoPage({ title: nf.title, description: nf.description, path: route.path })
  useHead({ meta: [{ name: 'robots', content: 'noindex' }] })
}
else {
  const info = data.value!.info
  const path = `/videos/${slug}`
  const description = String(c.value.seo_description || '').trim() || info.description || undefined
  const video: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: info.title,
    description: info.description || info.title,
    thumbnailUrl: info.thumbnail ? [info.thumbnail] : undefined,
    uploadDate: info.uploadDate || undefined,
    duration: info.duration || undefined,
    contentUrl: info.contentUrl || undefined,
    embedUrl: info.embedUrl || undefined,
    url: absoluteUrl(path),
    isPartOf: { '@type': 'WebSite', name: 'Golden Wings', url: `${SITE_URL}/` },
  }
  useSeoPage({
    title: String(c.value.seo_title || '').trim() || info.title || undefined,
    description,
    path,
    ogImage: info.thumbnail || undefined,
    ogType: 'video.other',
    jsonLd: JSON.parse(JSON.stringify(video)),
  })
  if (data.value!.draft) useHead({ meta: [{ name: 'robots', content: 'noindex' }] })
}

</script>

<template>
  <div v-if="notFound" class="site-main">
    <section class="hero" style="min-height: 50vh;">
      <h1 class="hero__headline">{{ nf.h1 }}</h1>
      <p class="hero__lede">{{ nf.lede }}</p>
      <div class="hero__ctas">
        <a class="btn btn--primary" href="/">Home</a>
        <a class="btn btn--ghost" href="/indie-doc-journey">Journey</a>
      </div>
    </section>
  </div>
  <div v-else :data-content-id="`videoLibrary/studio/videos/${slug}.json`" class="sb-page sb-page--video">
    <section class="sb-section sb-theme--slate vid-player">
      <div class="sb-wrap">
        <div v-if="player" class="sb-video vid-player__frame">
          <iframe
            :src="player"
            :title="title || 'Golden Wings video'"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowfullscreen
          />
        </div>
      </div>
    </section>
    <section class="sb-section sb-theme--light vid-copy">
      <div class="sb-wrap vid-copy__wrap">
        <h1 v-if="title" class="sb-title sb-title--monument">{{ title }}</h1>
        <div v-if="paragraphs.length" class="sb-rt vid-copy__desc">
          <p v-for="(p, i) in paragraphs" :key="i">{{ p }}</p>
        </div>
        <div v-if="hasTranscript" class="vid-copy__block">
          <h2 class="sb-title sb-title--monument vid-copy__h2">Transcript</h2>
          <SbRichText :doc="c.transcript" />
        </div>
        <div v-if="hasCredits" class="vid-copy__block">
          <h2 class="sb-title sb-title--monument vid-copy__h2">Credits</h2>
          <SbRichText :doc="c.credits" />
        </div>
      </div>
    </section>
    <GwingzBand page="videos" />
  </div>
</template>

<style scoped>
/* Short pages: the light section grows so the band sits right on the footer (main has a min-height). */
.sb-page { display: flex; flex-direction: column; min-height: inherit; }
.vid-copy { flex: 1 0 auto; }
.vid-player { padding-block: clamp(24px, 4vw, 48px); }
.vid-player__frame { width: min(100%, 1100px); margin-inline: auto; }
.vid-copy__wrap { max-width: 820px; }
.vid-copy__desc p { white-space: pre-line; }
.vid-copy__block { margin-top: 2.5rem; }
.vid-copy__h2 { font-size: clamp(1.25rem, 2.4vw, 1.75rem); }
</style>
