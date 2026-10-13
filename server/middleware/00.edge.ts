/**
 * Edge rules for the Worker (runs before anything else):
 *  1. Legacy redirects (server/redirects.json, source of truth): one hop, query preserved.
 *  2. Trailing slash -> 301 to the no-slash canonical form (single hop).
 *  3. Press kit originals and the dispatch PDF (media/manifest.json "r2") come byte-exact from the
 *     R2 binding MEDIA (bucket golden-wings-robyn-media) at their original URLs.
 *  4. Serve prerendered HTML + public files from the ASSETS binding with cache headers,
 *     a branded 404, and X-Robots-Tag noindex on non-production Workers.
 *  5. The video pages (/videos, /videos/<slug>) and /sitemap-videos.xml are server-rendered by Nuxt,
 *     not served from ASSETS; they get the same noindex header and no-cache HTML policy.
 * During prerender (Node) there is no ASSETS binding, so steps 3-4 are skipped.
 */
import redirects from '../redirects.json'
import manifest from '../../media/manifest.json'

type Rule = { target: string, status: number }
const RULES = redirects as Record<string, Rule>

const IMAGE_RE = /\.(png|jpe?g|gif|webp|avif|svg|ico)$/i
const R2_KEYS = new Set((manifest.r2 as string[]).map(p => p.replace(/^\//, '')))
const VIDEO_SSR = /^\/(videos(\/[^/]+)?|sitemap-videos\.xml)$/

/** Serve one R2 object like the static asset it replaced: same Content-Type, full-length GET, no Content-Disposition. */
async function serveMedia(bucket: any, key: string, method: string, reqHeaders: Headers, siteEnv?: string): Promise<Response | null> {
  const obj = method === 'HEAD' ? await bucket.head(key) : await bucket.get(key, { range: reqHeaders, onlyIf: reqHeaders })
  if (!obj) return null
  const h = new Headers()
  obj.writeHttpMetadata(h)
  h.set('etag', obj.httpEtag)
  h.set('accept-ranges', 'bytes')
  // Same caching the Worker/static assets gave these paths before the move.
  h.set('cache-control', /\.pdf$/i.test(key) ? 'public, max-age=0, must-revalidate' : 'public, max-age=604800, stale-while-revalidate=86400')
  if (siteEnv !== 'production') h.set('X-Robots-Tag', 'noindex, nofollow')
  if (method === 'HEAD') {
    h.set('content-length', String(obj.size))
    return new Response(null, { status: 200, headers: h })
  }
  if (!('body' in obj) || !obj.body) {
    const conditionalGet = reqHeaders.has('if-none-match') || reqHeaders.has('if-modified-since')
    return new Response(null, { status: conditionalGet ? 304 : 412, headers: h })
  }
  if (reqHeaders.has('range') && obj.range) {
    const r = obj.range as { offset?: number, length?: number, suffix?: number }
    const length = r.suffix !== undefined ? Math.min(r.suffix, obj.size) : (r.length ?? obj.size - (r.offset ?? 0))
    const offset = r.suffix !== undefined ? obj.size - length : (r.offset ?? 0)
    h.set('content-range', `bytes ${offset}-${offset + length - 1}/${obj.size}`)
    h.set('content-length', String(length))
    return new Response(obj.body, { status: 206, headers: h })
  }
  h.set('content-length', String(obj.size))
  return new Response(obj.body, { status: 200, headers: h })
}

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)
  const path = url.pathname
  // Studio needs the current local dump; Cloudflare's ASSETS binding points at build output.
  const contentDump = import.meta.dev && path.match(/^\/__nuxt_content\/([A-Za-z][A-Za-z0-9_]*)\/sql_dump\.txt$/)
  if (contentDump) {
    const dump = await useStorage('contentDumps').getItem(`dump.${contentDump[1]}.sql`)
    if (typeof dump === 'string' && dump.length) {
      setResponseHeader(event, 'content-type', 'text/plain')
      return dump
    }
  }
  if (path.startsWith('/api/') || path === '/api') return

  const norm = path === '/' ? '/' : (path.replace(/\/+$/, '') || '/')
  const rule = RULES[norm]
  if (rule) {
    const loc = /^https?:\/\//i.test(rule.target) ? rule.target : `${url.origin}${rule.target}${url.search}`
    return new Response(null, { status: rule.status, headers: { location: loc, 'cache-control': 'public, max-age=3600' } })
  }
  if (norm !== path) {
    return new Response(null, { status: 301, headers: { location: `${url.origin}${norm}${url.search}`, 'cache-control': 'public, max-age=3600' } })
  }

  const env = (event.context as any).cloudflare?.env
  if (VIDEO_SSR.test(path)) {
    if (env && env.SITE_ENV !== 'production') setResponseHeader(event, 'X-Robots-Tag', 'noindex, nofollow')
    setResponseHeader(event, 'cache-control', 'public, max-age=0, must-revalidate')
    return
  }
  if (!env?.ASSETS) return
  const method = event.method
  if (method !== 'GET' && method !== 'HEAD') return

  if (env.MEDIA) {
    let key = ''
    try { key = decodeURIComponent(path.slice(1)) } catch { key = '' }
    if (key && R2_KEYS.has(key)) {
      const media = await serveMedia(env.MEDIA, key, method, toWebRequest(event).headers, env.SITE_ENV)
      if (media) return media
    }
  }

  // Local Studio routes and content previews must reach Nuxt, not a previous static build.
  if (import.meta.dev) return

  // Asset server canonicalizes "&" in _ipx paths to %26 with a 307; ask for the encoded form directly.
  const assetUrl = new URL(url.toString())
  if (path.startsWith('/_ipx/')) assetUrl.pathname = path.replace(/&/g, '%26')
  const assetReq = new Request(assetUrl.toString(), { method, headers: toWebRequest(event).headers })
  let res: Response = await env.ASSETS.fetch(assetReq)
  let status = res.status
  if (status === 404 || path === '/404') {
    const nf: Response = await env.ASSETS.fetch(new Request(`${url.origin}/404`, { method }))
    res = nf
    status = 404
  }

  const h = new Headers(res.headers)
  if (env.SITE_ENV !== 'production') h.set('X-Robots-Tag', 'noindex, nofollow')
  if (path.startsWith('/_ipx/')) {
    if (path.includes('f_webp')) h.set('content-type', 'image/webp')
    h.set('cache-control', 'public, max-age=31536000, immutable')
  } else if (path.startsWith('/fonts/')) {
    h.set('access-control-allow-origin', '*')
    h.set('access-control-allow-methods', 'GET, HEAD, OPTIONS')
    h.set('cross-origin-resource-policy', 'cross-origin')
    h.set('cache-control', 'public, max-age=31536000, immutable')
  } else if (IMAGE_RE.test(path) || /\.(pdf|woff2?|ttf|otf)$/i.test(path)) {
    h.set('cache-control', 'public, max-age=604800, stale-while-revalidate=86400')
  } else if ((h.get('content-type') || '').includes('text/html')) {
    h.set('content-type', 'text/html; charset=utf-8')
    h.set('cache-control', 'public, max-age=0, must-revalidate')
  }
  return new Response(res.body, { status, statusText: status === 404 ? 'Not Found' : res.statusText, headers: h })
})
