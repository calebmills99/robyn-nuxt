/**
 * Block helpers for the locally edited pages: image URLs, links, and the site rules that are
 * enforced in code no matter what an editor types:
 *  - no Watch buttons/links and no gwingz.com links inside blocks (the single gwingz.com band
 *    is rendered by the page after the blocks, see SbPage.vue / GwingzBand.vue);
 *  - rich text links to gwingz.com are rendered as plain text.
 */
import { CF_IMAGES_BASE, cfImageUrl, mediaProvider } from '~/utils/media'

export type SbAsset = { filename?: string | null, alt?: string | null, title?: string | null, copyright?: string | null, focus?: string | null } | null | undefined
export type SbLink = { linktype?: string, url?: string, cached_url?: string, email?: string, anchor?: string, target?: string, story?: { full_slug?: string, url?: string } } | null | undefined

// Assets stored as absolute URLs on this site are served from the site path.
const SITE_ORIGINS = [
  'https://golden-wings-robyn-nuxt.calebmills99.workers.dev',
  'https://golden-wings-robyn.com',
  'https://www.golden-wings-robyn.com',
]

/** Site path for URLs on this site, otherwise the URL unchanged. */
export function sitePath(url: string): string {
  for (const o of SITE_ORIGINS) if (url.startsWith(o + '/')) return url.slice(o.length)
  return url
}

const GW_WIDTHS = [480, 640, 960, 1280, 1920]
const SQ_WIDTHS = [100, 300, 500, 750, 1000, 1500, 2500]
const isSbAsset = (url: string) => /^https:\/\/a(-[a-z]+)?\.storyblok\.com\//.test(url) && !/\.(svg|gif)$/i.test(url)
const isSqCdn = (url: string) => /^https:\/\/images\.squarespace-cdn\.com\//.test(url) && !/[?&]format=/.test(url)
const rawUrl = (src: string | SbAsset) => (typeof src === 'string' ? src : (src?.filename || ''))

/** Display URL for an image at about `width` CSS px (the browser gets 2x via srcset). */
export function sbImg(src: string | SbAsset, width = 1280): string {
  const raw = rawUrl(src)
  if (!raw) return ''
  const url = sitePath(raw)
  // Moved to Cloudflare Images (media/manifest.json): named width variant.
  if (url.startsWith('/') && mediaProvider(url) === 'cfimages') {
    const v = GW_WIDTHS.find(w => w >= width) || 1920
    return cfImageUrl(url, `gwr${v}`)
  }
  // Assets still on the a.storyblok.com CDN (imported URLs): image service resize + webp (not for SVG/GIF).
  if (isSbAsset(url)) {
    return `${url}/m/${Math.round(width)}x0/filters:format(webp)`
  }
  // Squarespace CDN: its own width formats.
  if (isSqCdn(url)) {
    const sq = SQ_WIDTHS.find(w => w >= width) || 2500
    return `${url}?format=${sq}w`
  }
  return url
}

export function sbSrcset(src: string | SbAsset, width: number): string | undefined {
  const a = sbImg(src, width)
  const b = sbImg(src, width * 2)
  return a && b && a !== b ? `${a} 1x, ${b} 2x` : undefined
}

/** Pixel size of an a.storyblok.com asset, read from its URL (/f/<space>/<W>x<H>/...). */
export function sbDims(src: string | SbAsset): { width: number, height: number } | undefined {
  const m = /^https:\/\/a(?:-[a-z]+)?\.storyblok\.com\/f\/\d+\/(\d+)x(\d+)\//.exec(rawUrl(src))
  if (!m) return undefined
  const width = Number(m[1]), height = Number(m[2])
  return width > 0 && height > 0 ? { width, height } : undefined
}

/** width/height attributes (aspect ratio for the browser, no layout shift) when the asset size is known. */
export function sbSizeAttrs(src: string | SbAsset): { width?: number, height?: number } {
  return sbDims(src) || {}
}

/** Width that sbImg would actually deliver for a request, never above the asset's own width. */
function deliver(src: string | SbAsset, width: number, cap: number): { url: string, w: number } | undefined {
  const raw = rawUrl(src)
  if (!raw) return undefined
  const url = sitePath(raw)
  if (url.startsWith('/') && mediaProvider(url) === 'cfimages') {
    const v = GW_WIDTHS.find(w => w >= width && w <= cap) || [...GW_WIDTHS].reverse().find(w => w <= cap) || GW_WIDTHS[0]!
    return { url: cfImageUrl(url, `gwr${v}`), w: v }
  }
  if (isSbAsset(url)) {
    const own = sbDims(src)?.width
    const w = Math.round(Math.min(width, cap, own || Infinity))
    return { url: sbImg(src, w), w }
  }
  if (isSqCdn(url)) {
    const v = SQ_WIDTHS.find(w => w >= width && w <= cap) || [...SQ_WIDTHS].reverse().find(w => w <= cap) || SQ_WIDTHS[0]!
    return { url: `${url}?format=${v}w`, w: v }
  }
  return undefined
}

/**
 * Width-based srcset ("url 640w, ...") for the widths asked for, never above `cap` px and never
 * above the asset's own width. Undefined when the source has no resizable versions.
 */
export function sbSrcsetW(src: string | SbAsset, widths: number[], cap = Math.max(...widths)): string | undefined {
  const seen = new Map<number, string>()
  for (const want of widths) {
    const d = deliver(src, want, cap)
    if (d && !seen.has(d.w)) seen.set(d.w, d.url)
  }
  if (seen.size < 2) return undefined
  return [...seen].sort((a, b) => a[0] - b[0]).map(([w, u]) => `${u} ${w}w`).join(', ')
}

/** Single URL at about `width` px, capped at `cap` and at the asset's own width. */
export function sbImgCapped(src: string | SbAsset, width: number, cap = width): string {
  return deliver(src, width, cap)?.url || sbImg(src, width)
}

/** Full-size URL (downloads, "open image" links). */
export function sbOriginal(src: string | SbAsset): string {
  const raw = typeof src === 'string' ? src : (src?.filename || '')
  return raw ? sitePath(raw) : ''
}

export function isImagesCdn(url: string) {
  return url.startsWith(CF_IMAGES_BASE)
}

/** href for a link field (imported multilink shape). Internal story links map to the site's real paths. */
export function sbHref(link: SbLink): string {
  if (!link) return ''
  if (link.linktype === 'email' && link.email) return `mailto:${link.email}`
  if (link.linktype === 'story') {
    const slug = link.story?.full_slug || link.cached_url || ''
    const path = slug === 'home' || slug === '' ? '/' : `/${slug.replace(/^\/+|\/+$/g, '')}`
    return link.anchor ? `${path}#${link.anchor}` : path
  }
  const url = (link.url || link.cached_url || '').trim()
  if (!url) return ''
  return sitePath(url)
}

export const isGwingz = (href: string) => /(^|\/\/|\.)gwingz\.com(\/|$|\?|#)/i.test(href)
export const isWatchLabel = (label: string) => /\bwatch\b/i.test(label || '')

/** A button/link an editor added is shown only if it obeys the site rules. */
export function allowedLink(label: string, href: string): boolean {
  if (!href) return false
  if (isGwingz(href)) return false
  if (isWatchLabel(label)) return false
  return true
}

export const isExternal = (href: string) => /^https?:\/\//i.test(href) && !href.startsWith('/')

// ---------- Rich text (imported rich-text JSON -> HTML) ----------

const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

type RtNode = { type: string, text?: string, attrs?: Record<string, any>, content?: RtNode[], marks?: { type: string, attrs?: Record<string, any> }[] }

function renderMarks(node: RtNode): string {
  let html = esc(node.text || '')
  for (const m of node.marks || []) {
    switch (m.type) {
      case 'bold': html = `<strong>${html}</strong>`; break
      case 'italic': html = `<em>${html}</em>`; break
      case 'underline': html = `<u>${html}</u>`; break
      case 'strike': html = `<s>${html}</s>`; break
      case 'code': html = `<code>${html}</code>`; break
      case 'superscript': html = `<sup>${html}</sup>`; break
      case 'subscript': html = `<sub>${html}</sub>`; break
      case 'link': {
        const a = m.attrs || {}
        let href = String(a.href || '')
        if (a.linktype === 'email' && href && !href.startsWith('mailto:')) href = `mailto:${href}`
        if (a.linktype === 'story') href = a.story?.full_slug ? `/${a.story.full_slug}` : href
        href = sitePath(href)
        if (a.anchor) href += `#${a.anchor}`
        // Site rule: no gwingz.com links and no Watch links inside the editable blocks.
        if (!href || isGwingz(href) || isWatchLabel(node.text || '')) break
        const ext = isExternal(href)
        const target = a.target === '_blank' || ext ? ' target="_blank" rel="noopener"' : ''
        html = `<a href="${esc(href)}"${target}>${html}</a>`
        break
      }
    }
  }
  return html
}

function renderNodes(nodes: RtNode[] = []): string {
  return nodes.map(renderNode).join('')
}

function renderNode(n: RtNode): string {
  switch (n.type) {
    case 'doc': return renderNodes(n.content)
    case 'text': return renderMarks(n)
    case 'paragraph': return `<p>${renderNodes(n.content)}</p>`
    case 'heading': {
      // One h1 per page: rich text h1 renders as an h2 in the Akira display face.
      const lvl = Math.min(Math.max(Number(n.attrs?.level) || 2, 1), 6)
      if (lvl === 1) return `<h2 class="sb-h sb-h--akira">${renderNodes(n.content)}</h2>`
      return `<h${lvl} class="sb-h sb-h--${lvl}">${renderNodes(n.content)}</h${lvl}>`
    }
    case 'bullet_list': return `<ul>${renderNodes(n.content)}</ul>`
    case 'ordered_list': return `<ol>${renderNodes(n.content)}</ol>`
    case 'list_item': return `<li>${renderNodes(n.content)}</li>`
    case 'blockquote': return `<blockquote>${renderNodes(n.content)}</blockquote>`
    case 'hard_break': return '<br>'
    case 'horizontal_rule': return '<hr>'
    case 'image': {
      const src = sbImg(String(n.attrs?.src || ''), 960)
      return src ? `<img src="${esc(src)}" alt="${esc(n.attrs?.alt || '')}" loading="lazy">` : ''
    }
    default: return renderNodes(n.content)
  }
}

export function richTextHtml(doc: unknown): string {
  if (!doc) return ''
  if (typeof doc === 'string') return `<p>${esc(doc)}</p>`
  return renderNode(doc as RtNode)
}

export function richTextIsEmpty(doc: any): boolean {
  if (!doc) return true
  if (typeof doc === 'string') return !doc.trim()
  return !JSON.stringify(doc).includes('"text":"')
}

/** Section wrapper classes shared by the blocks (theme ground, wave edge). */
export function sectionClasses(blok: any, base: string) {
  const theme = blok.theme || 'none'
  return [base, 'sb-section', `sb-theme--${theme}`, { 'sb-section--wave': blok.divider_top === 'wave', 'sb-section--bg': !!blok.background_image?.filename }, ...colorClasses(blok)]
}

export function sectionStyle(blok: any) {
  const bg = blok.background_image?.filename ? sbImg(blok.background_image, 1920) : ''
  const style: Record<string, string> = { ...colorVars(blok) }
  if (bg) style.backgroundImage = `url("${bg}")`
  return Object.keys(style).length ? style : undefined
}

/*
 * Per-section colour overrides from the block's Style tab. Each colour is a dropdown of
 * style-guide colours (blank = theme default, "custom" = use the code field) plus a
 * `<key>_custom` text field. A valid hex code in the text field wins over the dropdown;
 * anything that is not #rgb, #rrggbb or #rrggbbaa is ignored. Nothing set = no class and
 * no inline style, so the theme look is exactly unchanged.
 */
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i
const COLOR_KEYS: Array<[key: string, cssVar: string, cls: string]> = [
  ['heading_color', '--sb-c-heading', 'sb-c--heading'],
  ['text_color', '--sb-c-text', 'sb-c--text'],
  ['background_color', '--sb-c-bg', 'sb-c--bg'],
  ['button_color', '--sb-c-btn', 'sb-c--btn'],
  ['button_text_color', '--sb-c-btn-text', 'sb-c--btn-text'],
]

export function sbColor(blok: any, key: string): string | undefined {
  const custom = String(blok?.[`${key}_custom`] ?? '').trim()
  if (HEX_COLOR.test(custom)) return custom
  const pick = String(blok?.[key] ?? '').trim()
  return HEX_COLOR.test(pick) ? pick : undefined
}

export function colorVars(blok: any): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, cssVar] of COLOR_KEYS) {
    const c = sbColor(blok, key)
    if (c) out[cssVar] = c
  }
  return out
}

export function colorClasses(blok: any): string[] {
  return COLOR_KEYS.filter(([key]) => sbColor(blok, key)).map(([, , cls]) => cls)
}

export function badgeList(s?: string): string[] {
  return String(s || '').split(',').map(x => x.trim()).filter(Boolean)
}
