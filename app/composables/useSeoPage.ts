import { absoluteUrl, DEFAULT_OG_IMAGE, SITE_URL } from '~/utils/seo'
import { shareImageUrl } from '~/utils/media'

export interface SeoInput {
  title?: string
  fullTitle?: string
  description?: string
  path: string
  ogImage?: string
  ogType?: 'website' | 'article' | 'video.other'
  jsonLd?: Record<string, unknown> | Record<string, unknown>[]
}

export const DEFAULT_DESCRIPTION
  = 'Golden Wings, an award-winning aviation documentary following Robyn Stewart\'s 55-year career as a flight attendant, told by her son Caleb Mills Stewart.'

/** Head tags identical in shape to the Astro BaseLayout. Canonical always points at the apex, no trailing slash. */
export function useSeoPage(o: SeoInput) {
  const title = o.title || 'Golden Wings'
  const pageTitle = o.fullTitle || (title === 'Golden Wings' ? 'Golden Wings: Stewardess to Sky Queen' : `${title} · Golden Wings`)
  const description = o.description || DEFAULT_DESCRIPTION
  const path = o.path === '/' ? '/' : o.path.replace(/\/+$/, '')
  const canonical = path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`
  const og = o.ogImage ? absoluteUrl(shareImageUrl(o.ogImage)!) : DEFAULT_OG_IMAGE
  const blocks = o.jsonLd ? (Array.isArray(o.jsonLd) ? o.jsonLd : [o.jsonLd]) : []
  useHead({
    title: pageTitle,
    link: [{ rel: 'canonical', href: canonical }],
    meta: [
      { name: 'description', content: description },
      { property: 'og:site_name', content: 'Golden Wings' },
      { property: 'og:type', content: o.ogType || 'website' },
      { property: 'og:url', content: canonical },
      { property: 'og:title', content: pageTitle },
      { property: 'og:description', content: description },
      { property: 'og:image', content: og },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: pageTitle },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: og },
    ],
    script: blocks.map(b => ({ type: 'application/ld+json', innerHTML: JSON.stringify(b) })),
  })
  return { pageTitle, description, canonical }
}

/** Read a structured-copy entry from content/site/<name>.md (extra frontmatter lives in meta). */
export async function useSiteCopy(name: string) {
  // Site chrome is read from local settings; keep it reactive while Studio edits it.
  if (name === 'chrome') {
    const { data } = await useAsyncData('local-chrome', () => $fetch<any>('/api/content/settings'))
    const chrome = reactive({ ...(data.value?.chrome || useAppConfig().siteChrome) })
    watch(data, value => Object.assign(chrome, value?.chrome || {}))
    return chrome as any
  }
  const { data } = await useAsyncData(`site-${name}`, () => queryCollection('site').path(`/_site/${name}`).first())
  if (!data.value) throw createError({ statusCode: 500, statusMessage: `Missing content/site/${name}.md` })
  const page = data.value as any
  return { ...(page.meta || {}), ...page } as any
}
