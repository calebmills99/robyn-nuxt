/**
 * Local video entries for /videos, /videos/<slug>, and /sitemap-videos.xml.
 * The production listing and video sitemap include published entries only.
 */
import { localVideos } from './localContent'
import { isoDuration, sbDateIso, streamEmbed, streamHls, streamIdFrom, videoThumb } from '../../app/utils/stream'

export interface VideoInfo {
  id: number
  slug: string
  path: string
  title: string
  description: string
  streamId: string
  thumbnail: string
  uploadDate: string
  duration: string
  seconds: number
  contentUrl: string
  embedUrl: string
}

// Duration from the Stream HLS manifest (sum of the first variant's segment lengths), cached per isolate.
const durations = new Map<string, number>()
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; golden-wings-robyn.com)' }
export async function streamSeconds(uid: string): Promise<number> {
  if (!uid) return 0
  const hit = durations.get(uid)
  if (hit) return hit
  try {
    const master = await fetch(streamHls(uid), { headers: UA }).then(r => (r.ok ? r.text() : ''))
    const variant = master.split('\n').map(l => l.trim()).find(l => l && !l.startsWith('#') && /m3u8/.test(l))
    if (!variant) return 0
    const list = await fetch(new URL(variant, streamHls(uid)).toString(), { headers: UA }).then(r => (r.ok ? r.text() : ''))
    let sec = 0
    for (const m of list.matchAll(/#EXTINF:([\d.]+)/g)) sec += Number(m[1])
    if (sec > 0) durations.set(uid, sec)
    return sec
  }
  catch { return 0 }
}

export async function videoInfo(story: any): Promise<VideoInfo> {
  const c = story?.content || {}
  const uid = streamIdFrom(c.stream_id)
  const seconds = await streamSeconds(uid)
  const slug = String(story?.slug || '')
  return {
    id: story?.id,
    slug,
    path: `/videos/${slug}`,
    title: String(c.title || '').trim(),
    description: String(c.description || '').trim(),
    streamId: uid,
    thumbnail: videoThumb(c),
    uploadDate: sbDateIso(c.upload_date),
    duration: seconds ? isoDuration(seconds) : '',
    seconds: Math.round(seconds),
    contentUrl: uid ? streamHls(uid) : '',
    embedUrl: uid ? streamEmbed(uid) : '',
  }
}

/** Published video stories, newest upload first. */
export async function publishedVideos(event: any): Promise<any[]> {
  return (await localVideos()).filter(s => s.published && streamIdFrom(s.content?.stream_id))
}
