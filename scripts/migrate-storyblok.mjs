// One-time, non-overwriting import of the preserved Storyblok export.
import fs from 'node:fs'
import path from 'node:path'
const source = path.resolve(process.argv[2] || '../export')
const published = JSON.parse(fs.readFileSync(path.join(source, 'published.json'), 'utf8'))
const drafts = JSON.parse(fs.readFileSync(path.join(source, 'draft.json'), 'utf8'))
const originals = {}
const clean = v => Array.isArray(v) ? v.map(clean) : v && typeof v === 'object'
  ? Object.fromEntries(Object.entries(v).filter(([k]) => k !== '_editable').map(([k, x]) => [k, clean(x)])) : v
const write = (name, data) => {
  fs.mkdirSync(path.dirname(name), { recursive: true })
  fs.writeFileSync(name, typeof data === 'string' ? data : JSON.stringify(data, null, 2) + '\n', { flag: 'wx' })
}
function markdown(n) {
  const children = () => (n.content || []).map(markdown).join('')
  switch (n.type) {
    case 'doc': return children().trim()
    case 'text': {
      let text = (n.text || '').replace(/([\\*_[\]])/g, '\\$1')
      for (const m of n.marks || []) {
        if (m.type === 'bold') text = '**' + text + '**'
        else if (m.type === 'italic') text = '*' + text + '*'
        else if (m.type === 'link') text = '[' + text + '](' + (m.attrs.href || '') + ')'
        else throw new Error('Unsupported rich-text mark: ' + m.type)
      }
      return text
    }
    case 'paragraph': return children() + '\n\n'
    case 'heading': return '#'.repeat(n.attrs?.level || 2) + ' ' + children() + '\n\n'
    case 'blockquote': return children().trim().split('\n').map(x => '> ' + x).join('\n') + '\n\n'
    case 'bullet_list': return (n.content || []).map(x => '- ' + markdown(x).trim().replace(/\n/g, '\n  ')).join('\n') + '\n\n'
    case 'ordered_list': return (n.content || []).map((x, i) => (i + 1) + '. ' + markdown(x).trim()).join('\n') + '\n\n'
    case 'list_item': return children()
    case 'hard_break': return '  \n'
    case 'horizontal_rule': return '---\n\n'
    default: throw new Error('Unsupported rich-text node: ' + n.type)
  }
}
function convert(value, uid = '') {
  if (!value || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(x => convert(x, uid))
  const owner = value._uid || uid
  const result = {}
  for (const [key, v] of Object.entries(value)) {
    if (v?.type === 'doc') {
      const text = markdown(v)
      originals[owner + ':' + key] = { markdown: text, document: v }
      result[key === 'body' ? 'text_markdown' : key] = text
    } else result[key === 'body' && typeof v === 'string' ? 'text_markdown' : key] = convert(v, owner)
  }
  return result
}
const schemas = []
const schemaImports = []
const labels = {
  seo_title: 'Search and social title', seo_description: 'Search and social description',
  hero_stream_id: 'Hero video â€” Cloudflare Stream ID', background_image: 'Background image or hero video',
  og_image: 'Social sharing image', text_markdown: 'Text (Markdown)', aside: 'Side text (Markdown)',
  filename: 'Image or file', sectionOrder: 'Section order', sections: 'Page sections',
  band_heading: 'Screening invitation heading', band_button_text: 'Screening invitation button',
  published: 'Published', transcript: 'Transcript (Markdown)', credits: 'Credits (Markdown)',
}
const label = key => labels[key] || key.replace(/[_-]/g, ' ').replace(/^\w/, c => c.toUpperCase())
const skip = new Set(['_uid', 'component', '_editable', 'fieldtype', 'id', 'is_external_url', 'is_private', 'src', 'source', 'updated_at', 'meta_data', 'content_type', 'focus'])
function schema(values, key = '', depth = 0) {
  const list = values.filter(v => v !== undefined && v !== null)
  const first = list[0]
  const meta = { label: label(key) }
  let out
  if (Array.isArray(first)) {
    const items = list.flat()
    out = 'z.array(' + (items.length ? schema(items, '', depth + 1) : 'z.string()') + ')'
  } else if (first && typeof first === 'object') {
    const keys = [...new Set(list.flatMap(v => Object.keys(v)))]
    out = 'z.object({\n' + keys.filter(k => !skip.has(k)).map(k => '  '.repeat(depth + 1) + JSON.stringify(k) + ': ' + schema(list.map(v => v[k]), k, depth + 1) + ',').join('\n') + '\n' + '  '.repeat(depth) + '}).passthrough()'
  } else if (typeof first === 'boolean') out = 'z.boolean()'
  else if (typeof first === 'number') out = 'z.number()'
  else {
    out = 'z.string()'
    if (key === 'filename') meta.input = 'media'
    else if (/text_markdown|aside|description|intro|transcript|credits|lede|note|text$/.test(key)) meta.input = 'textarea'
  }
  if (key) out += (first && typeof first === 'object' ? '' : '.editor(' + JSON.stringify(meta) + ')') + '.optional()'
  return out
}
const routes = { home: '/', film: '/film', 'about-the-film': '/about-the-film', 'press-kit': '/press-kit' }
const records = []
for (const story of published.filter(s => s.content.component === 'page')) {
  const pub = clean(story.content)
  const draft = clean(drafts.find(s => s.uuid === story.uuid).content)
  const make = content => {
    const local = convert(content)
    const sections = {}, sectionOrder = [], counts = {}
    for (const block of local.body) {
      const key = block.component.replace(/-/g, '_') + '_' + (counts[block.component] = (counts[block.component] || 0) + 1)
      sections[key] = block; sectionOrder.push(key)
    }
    const { body, ...page } = local
    return { title: story.name, route: routes[story.slug], ...page, sectionOrder, sections }
  }
  const local = make(pub)
  write('content/studio/pages/' + story.slug + '.json', local)
  const name = story.slug.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
  const schemaName = name + 'Schema'
  schemas.push('export const ' + schemaName + ' = ' + schema([local]) + '\n')
  schemaImports.push({ name, schemaName, source: 'studio/pages/' + story.slug + '.json' })
  records.push({ slug: story.slug, storyId: story.id, uuid: story.uuid, file: 'pages/' + story.slug + '.json', sectionCount: local.sectionOrder.length })
  if (JSON.stringify(pub) !== JSON.stringify(draft)) {
    write('content/studio/drafts/' + story.slug + '.json', make(draft))
    schemaImports.push({ name: name + 'Draft', schemaName, source: 'studio/drafts/' + story.slug + '.json' })
  }
}
const settings = clean(published.find(s => s.slug === 'site-settings').content)
const running = fs.readFileSync('../checkpoint/running-app.config.mjs', 'utf8')
const config = JSON.parse(running.split('const inlineConfig = ')[1].split('\n\n/** client **/')[0].trim())
const site = { title: 'Site settings', ...settings, chrome: config.siteChrome, notFound: config.siteNotFound }
write('content/studio/settings/site.json', site)
schemas.push('export const siteSettingsSchema = ' + schema([site]) + '\n')
schemaImports.push({ name: 'siteSettings', schemaName: 'siteSettingsSchema', source: 'studio/settings/site.json' })
const videos = drafts.filter(s => s.content.component === 'video')
const videoDocs = []
for (const story of videos) {
  const doc = { ...convert(clean(story.content)), slug: story.slug, published: published.some(p => p.uuid === story.uuid), storyId: story.id }
  write('content/studio/videos/' + story.slug + '.json', doc)
  videoDocs.push(doc)
}
schemas.push('export const videoLibrarySchema = ' + schema(videoDocs) + '\n')
schemaImports.push({ name: 'videoLibrary', schemaName: 'videoLibrarySchema', source: 'studio/videos/*.json' })
write('content/studio/schemas.ts', "import { z } from '@nuxt/content'\n\n// Explicit form schemas generated from the preserved page structures.\n// Unknown nested fields remain intact when a form field is edited.\n" + schemas.join('\n'))
write('server/data/richtext-originals.json', originals)
write('migration/import-manifest.json', { sourceExport: source.replace(/\\/g, '/'), pages: records, drafts: ['home'], videos: videos.map(s => s.full_slug), collections: schemaImports })
write('migration/published-originals.json', published)
write('migration/draft-originals.json', drafts)
write('migration/collections.txt', schemaImports.map(x => '    ' + x.name + ": defineCollection({ type: 'data', source: '" + x.source + "', schema: " + x.schemaName + ' }),').join('\n'))
console.log(JSON.stringify({ pages: records.length, sections: records.reduce((n, r) => n + r.sectionCount, 0), richTextFields: Object.keys(originals).length, videos: videos.length, collections: schemaImports.length }))

