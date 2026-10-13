/** Cloudflare Stream videos (public info/trailer clips, no signed URLs). */
export const STREAM_CUSTOMER = 'customer-e46l63ee4ck01nmz'
export const STREAM_VIDEOS: Record<string, string> = {
  hero: '4e7c5b8d7d630b53adbe054f3bebed30', // 747-synth-broll-reel.mp4 (home hero loop)
  college: '6a89f9b65ba8ad0590a183c9d6ebba4e', // stewardess-college-1968.mp4
  trailer: '68ad5b65dd4b00c8a72f28c5b27b0f96', // golden-wings-trailer.mp4 (About)
}

export function streamIframeSrc(uid: string, opts: { background?: boolean, poster?: string, title?: string } = {}) {
  const q = new URLSearchParams()
  if (opts.background) {
    q.set('autoplay', 'true'); q.set('muted', 'true'); q.set('loop', 'true'); q.set('controls', 'false')
  }
  q.set('preload', 'metadata')
  if (opts.poster) q.set('poster', opts.poster.startsWith('http') ? opts.poster : `https://golden-wings-robyn.com${opts.poster}`)
  return `https://${STREAM_CUSTOMER}.cloudflarestream.com/${uid}/iframe?${q.toString()}`
}

/**
 * Forgiving Cloudflare Stream ID reader for editor fields: accepts a bare 32-hex Video ID, or any
 * pasted Stream URL / iframe embed code (cloudflarestream.com or videodelivery.net) and pulls the
 * ID out. Returns '' when no Stream ID is found.
 */
export function streamIdFrom(input: unknown): string {
  const s = String(input ?? '').trim()
  if (/^[a-f0-9]{32}$/i.test(s)) return s.toLowerCase()
  const m = s.match(/(?:cloudflarestream\.com|videodelivery\.net)\/([a-f0-9]{32})(?=[/?#"'\s&]|$)/i)
  return m ? m[1]!.toLowerCase() : ''
}

/**
 * Normalise an editor's video field: a Stream ID (bare, URL or embed code) becomes the bare ID;
 * any other http(s) URL (.mp4, .m3u8, ...) is kept; anything else is ignored ('').
 */
export function videoSource(input: unknown): string {
  const id = streamIdFrom(input)
  if (id) return id
  const s = String(input ?? '').trim()
  return /^https?:\/\/\S+$/i.test(s) ? s : ''
}

/** Stream HLS manifest (VideoObject contentUrl). */
export function streamHls(uid: string) {
  return `https://${STREAM_CUSTOMER}.cloudflarestream.com/${uid}/manifest/video.m3u8`
}

/** Stream player page. Always with a query string: Stream's robots.txt blocks URLs ending in /iframe. */
export function streamEmbed(uid: string) {
  return `https://${STREAM_CUSTOMER}.cloudflarestream.com/${uid}/iframe?preload=metadata`
}

/**
 * Stable thumbnail for a video story: the uploaded thumbnail image if any, else the Stream frame
 * at `thumbnail_time` seconds (first frame when empty).
 */
export function videoThumb(c: any, height = 720): string {
  const img = String(c?.thumbnail?.filename || '').trim()
  if (img) return img
  const uid = streamIdFrom(c?.stream_id)
  if (!uid) return ''
  const t = Number.parseFloat(String(c?.thumbnail_time ?? ''))
  const time = Number.isFinite(t) && t > 0 ? `time=${Math.round(t * 10) / 10}s&` : ''
  return `https://${STREAM_CUSTOMER}.cloudflarestream.com/${uid}/thumbnails/thumbnail.jpg?${time}height=${height}`
}

/** Content datetime ("2026-09-25 19:59", UTC) -> ISO 8601 ("2026-09-25T19:59:00Z"); '' if unset. */
export function sbDateIso(v: unknown): string {
  const m = String(v ?? '').trim().match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2})(?::(\d{2}))?)?/)
  if (!m) return ''
  return `${m[1]}T${m[2] || '00:00'}:${m[3] || '00'}Z`
}

/** Seconds -> ISO 8601 duration (PT1M58S). */
export function isoDuration(sec: number): string {
  const s = Math.max(1, Math.round(sec))
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60
  return `PT${h ? `${h}H` : ''}${m ? `${m}M` : ''}${r ? `${r}S` : ''}`
}
