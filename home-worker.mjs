/**
 * Entry for the production Worker golden-wings-robyn-home (wrangler.home.jsonc).
 * It answers the 4 block pages (and their _payload.json), their /_nuxt build files, /api/content/* and the fonts the
 * live site lacks (home-routing.mjs). With HOME_PASSTHROUGH="1" every other request goes on,
 * unchanged, via fetch(request) to the live Worker golden-wings-robyn (the custom domain on the
 * same hostname; a route Worker's fetch() reaches the custom domain Worker behind it).
 * Switch off: HOME_PASSTHROUGH anything but "1" serves everything from Nuxt.
 */
import nitro from './.output/server/index.mjs'
import { ownedByNuxt } from './home-routing.mjs'

export default {
  ...nitro,
  async fetch(request, env, ctx) {
    if (env.HOME_PASSTHROUGH === '1' && !ownedByNuxt(new URL(request.url).pathname)) return fetch(request)
    return nitro.fetch(request, env, ctx)
  },
}
