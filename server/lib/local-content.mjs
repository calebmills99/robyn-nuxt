import { markdownToRichtext } from './markdown-richtext.mjs'
import originals from '../data/richtext-originals.json' with { type: 'json' }

const richFields = { 'image-text': ['body'], 'text-section': ['body', 'aside'], 'video-embed': ['body'], gallery: ['body'], video: ['transcript', 'credits'] }

/** Preserve the exact imported document until its Markdown is edited. */
export function inflateContent(value, uid = '', kind = '') {
  if (!value || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(v => inflateContent(v, uid, kind))
  const owner = value._uid || uid
  const component = value.component || kind
  const out = {}
  for (const [field, v] of Object.entries(value)) {
    const key = field === 'text_markdown' ? 'body' : field
    if (typeof v === 'string' && richFields[component]?.includes(key)) {
      const original = originals[owner + ':' + key]
      out[key] = original && v === original.markdown ? structuredClone(original.document) : v.trim() ? markdownToRichtext(v) : ''
    } else out[key] = inflateContent(v, owner, component)
  }
  return out
}

export function pageContent(document) {
  const { title, route, sectionOrder, sections, ...content } = document
  if (!Array.isArray(sectionOrder) || !sections) throw new Error('Page has no section order')
  if (new Set(sectionOrder).size !== sectionOrder.length) throw new Error('Duplicate section in page order')
  content.body = sectionOrder.map(key => {
    if (!sections[key]?.component) throw new Error('Unknown page section: ' + key)
    return sections[key]
  })
  return inflateContent(content)
}

