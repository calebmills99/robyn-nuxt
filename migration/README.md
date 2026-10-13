# Editing the migrated Golden Wings site

This checkout runs the existing Golden Wings layouts from local, editable content. The four migrated pages, shared settings, and video library no longer fetch their content from Storyblok, and the Storyblok SDK is removed: blocks render through `app/components/PageBlock.vue` (`app/components/blocks/`), Markdown fields convert via `server/lib/markdown-richtext.mjs`, and /, /film, /about-the-film and /press-kit are prerendered. Images still load from their original a.storyblok.com CDN URLs.

## Open the editor

The development preview is at http://127.0.0.1:3001/. Its floating Studio button opens the editor. Under **Content → Studio**, the folders are:

| Folder | Contents |
| --- | --- |
| Pages | Home, Film, About the Film, Press Kit |
| Drafts | The separately preserved unpublished Home revision |
| Settings | Header/footer copy and links, screening invitation, not-found copy |
| Videos | All six imported unpublished videos |

Studio saves edits into `content/studio/`. Paragraphs use the **Text Markdown** multiline field; headings, links, images, video IDs, and other existing fields have separate controls. The same JSON files can be edited directly. `sectionOrder` controls which existing sections appear and in what order. The existing Markdown pages, blog, and people remain in their original folders and Studio collections.

To restart this checkout:

```sh
cd 'C:/Users/caleb/Documents/Codex/2026-10-09/robyn-studio-migration/worktree'
npm run dev -- --host 127.0.0.1 --port 3001
```

The Home draft is previewed locally at http://127.0.0.1:3001/?draft=1. Editing the draft does not replace the published Home file. The six video files retain `published: false`; development shows them for editing, while a production build excludes them from the public listing, individual routes, and video sitemap. Studio is enabled for local development; production builds have Studio disabled.

## Preserved material

- Original checkout: `E:\~GoldenWings\presskit\robyn-nuxt`, branch `test/nuxt-studio`, HEAD `e27ec63c074862b0043e2d18086a38871a66c781`. Its 401 checkpointed files remained byte-for-byte unchanged during this migration.
- Migration checkout: branch `migrate/nuxt-studio-local`, including the original uncommitted edits.
- `../checkpoint/` relative to the **worktree root** contains the original working-file ZIP, SHA-256 manifest, patches, and recovered running header/footer configuration.
- `../export/` contains the raw paginated published and draft API responses, combined exports, manifest, and 59 downloaded assets with SHA-256 hashes.
- `migration/published-originals.json` and `migration/draft-originals.json` retain the imported story records inside this checkout.
- Existing media URLs are preserved. The downloaded assets are backups; images and video streams continue using their existing delivery URLs.
- `server/data/richtext-originals.json` retains the original rich-text documents. Unchanged Markdown renders from those exact documents; edited Markdown is converted for the existing Vue renderer.
- Retired Markdown copies of Home, Film, About the Film, and Press Kit remain on disk as references and are excluded from Studio's active collections. All existing Markdown files, including the user's prior edits, remained unchanged.
- Component definitions were reconstructed from the exported fields and existing Vue components. This is a content snapshot, not a Storyblok account export or revision-history export; management API credentials were not present.

## Verified result

`verification.json` records the completed checks. They include a real Studio paragraph edit, filesystem persistence, reload, preservation of every other field, four-page desktop/mobile comparison, a production build, local Worker requests, unpublished-content behavior, and backup hashes. The temporary editor test text was restored afterward.

The original rich-text component omitted paragraph HTML during server rendering. `SbRichText.vue` now renders that HTML on both server and client. Browser comparisons against the Storyblok-fed baseline use that same isolated rendering fix; the untouched-baseline measurements remain in `../baseline-before-render-fix.json`. Across both viewport sizes, text, headings, links, titles, descriptions, section counts, and section heights matched, with no horizontal overflow or browser errors.

Initial import preservation can be checked with `node scripts/test-local-content.mjs`; those snapshot comparisons deliberately compare the imported files to the original export. Existing home routing is checked with `node scripts/test-home-routing.mjs`. `npm run build` completed with the existing post-build scripts. No deployment was performed.

`scripts/migrate-storyblok.mjs` is the one-time import utility. It uses non-overwriting writes and the preserved export/checkpoint. Normal editing does not run this importer.
