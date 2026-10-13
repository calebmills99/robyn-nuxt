import { defineContentConfig, defineCollection, z } from '@nuxt/content'
import { homeSchema, filmSchema, aboutTheFilmSchema, pressKitSchema, siteSettingsSchema, videoLibrarySchema } from './content/studio/schemas'

// Studio JSON contains the migrated pages; existing Markdown collections remain in place.
// Extra Markdown frontmatter keys land in `meta` and are read by the page templates.
export default defineContentConfig({
  collections: {
    home: defineCollection({ type: 'data', source: 'studio/pages/home.json', schema: homeSchema }),
    homeDraft: defineCollection({ type: 'data', source: 'studio/drafts/home.json', schema: homeSchema }),
    film: defineCollection({ type: 'data', source: 'studio/pages/film.json', schema: filmSchema }),
    aboutTheFilm: defineCollection({ type: 'data', source: 'studio/pages/about-the-film.json', schema: aboutTheFilmSchema }),
    pressKit: defineCollection({ type: 'data', source: 'studio/pages/press-kit.json', schema: pressKitSchema }),
    siteSettings: defineCollection({ type: 'data', source: 'studio/settings/site.json', schema: siteSettingsSchema }),
    videoLibrary: defineCollection({ type: 'data', source: 'studio/videos/*.json', schema: videoLibrarySchema }),

    // Structured copy for hand-built pages; retired page copies remain on disk as references.
    site: defineCollection({
      type: 'page',
      source: { include: 'site/*.md', exclude: ['site/home.md', 'site/film.md', 'site/press-kit.md'], prefix: '/_site' },
      schema: z.object({ fullTitle: z.string().optional(), ogImage: z.string().optional() }),
    }),
    // Generic content pages rendered at /<slug> (legal, SMS, about, 8 campaign pages)
    pages: defineCollection({
      type: 'page',
      source: { include: 'pages/*.md', exclude: ['pages/about-the-film.md'], prefix: '/' },
      schema: z.object({
        layout: z.enum(['legal', 'optin', 'about', 'campaign']).default('campaign'),
        sourceUrl: z.string().optional(),
        scrapedAt: z.string().optional(),
        reason: z.string().optional(),
      }),
    }),
    blog: defineCollection({
      type: 'page',
      source: { include: 'blog/*.md', prefix: '/indie-doc-journey' },
      schema: z.object({
        slug: z.string().optional(),
        tags: z.array(z.string()).default([]),
        cover: z.string().optional(),
        rawbody: z.string(),
        sourceUrl: z.string().optional(),
        scrapedAt: z.string().optional(),
        reason: z.string().optional(),
      }),
    }),
    people: defineCollection({
      type: 'page',
      source: { include: 'people/*.md', prefix: '/people' },
      schema: z.object({
        name: z.string(),
        role: z.string(),
        order: z.number(),
        lede: z.string(),
        years: z.string().optional(),
        portrait: z.string().optional(),
        portraitAlt: z.string().optional(),
      }),
    }),
    dispatch: defineCollection({
      type: 'page',
      source: { include: 'special-dispatch/*.md', prefix: '/special-dispatch' },
      schema: z.object({
        fullTitle: z.string().optional(),
        h1: z.string(),
        ogImage: z.string().optional(),
        featuredAlt: z.string().optional(),
        eyebrow: z.string().optional(),
        pdf: z.string().optional(),
        part2: z.string().optional(),
        faqIntro: z.string().optional(),
        faqs: z.array(z.object({ question: z.string(), answer: z.string() })).default([]),
      }),
    }),
  },
})
