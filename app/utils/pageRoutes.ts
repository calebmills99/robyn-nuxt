/** Routes built from local block content (content/studio/pages); they draw their own full-bleed sections. */
export const PAGE_ROUTES = ['/', '/film', '/about-the-film', '/press-kit']

/** /videos and /videos/<slug>: local video entries (content/studio/videos), server-rendered. */
export function isVideoPath(path: string): boolean {
  return /^\/videos(\/[^/]+)?$/.test(path.replace(/\/+$/, ''))
}
