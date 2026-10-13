import { pageContent, inflateContent } from '../lib/local-content.mjs'

export const LOCAL_PAGES = ['home', 'film', 'about-the-film', 'press-kit']

/** Nitro bundles these files for Workers; its development storage reads local edits. */
export async function localDocument(key: string): Promise<any> {
  const value = await useStorage('assets:local-content').getItem(key)
  if (!value) throw createError({ statusCode: 404, statusMessage: 'Content not found' })
  return typeof value === 'string' ? JSON.parse(value) : value
}

export async function localPage(slug: string, draft = false) {
  if (!LOCAL_PAGES.includes(slug)) throw createError({ statusCode: 404, statusMessage: 'Page not found' })
  const useDraft = import.meta.dev && draft && slug === 'home'
  const document = await localDocument((useDraft ? 'drafts/' : 'pages/') + slug + '.json')
  return { story: { id: slug, slug, content: pageContent(document) }, draft: useDraft }
}

export async function localVideo(slug: string) {
  if (!/^[a-z0-9][a-z0-9-]{0,99}$/.test(slug)) throw createError({ statusCode: 404, statusMessage: 'Video not found' })
  const doc = await localDocument('videos/' + slug + '.json')
  if (!doc.published && !import.meta.dev) throw createError({ statusCode: 404, statusMessage: 'Video not found' })
  const { slug: _, published, storyId, ...content } = doc
  return { id: storyId, slug, content: inflateContent(content), published }
}

export async function localVideos() {
  const storage = useStorage('assets:local-content')
  const keys = await storage.getKeys('videos')
  const docs = await Promise.all(keys.filter(k => k.endsWith('.json')).map(k => localDocument(k)))
  return docs.filter(d => d.published || import.meta.dev)
    .map(d => ({ id: d.storyId, slug: d.slug, content: inflateContent(d), published: d.published }))
    .sort((a, b) => String(b.content.upload_date).localeCompare(String(a.content.upload_date)))
}

