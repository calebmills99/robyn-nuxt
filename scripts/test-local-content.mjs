import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { pageContent, inflateContent } from '../server/lib/local-content.mjs'

const read = p => JSON.parse(fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8'))
const clean = v => Array.isArray(v) ? v.map(clean) : v && typeof v === 'object'
  ? Object.fromEntries(Object.entries(v).filter(([k]) => k !== '_editable').map(([k, x]) => [k, clean(x)])) : v
const published = read('migration/published-originals.json')
const drafts = read('migration/draft-originals.json')

for (const story of published.filter(s => s.content.component === 'page')) {
  test(story.slug + ': all original fields and section order survive conversion', () => {
    assert.deepEqual(pageContent(read('content/studio/pages/' + story.slug + '.json')), clean(story.content))
  })
}
test('Home draft retains unpublished changes separately', () => {
  const story = drafts.find(s => s.slug === 'home')
  assert.deepEqual(pageContent(read('content/studio/drafts/home.json')), clean(story.content))
  assert.notDeepEqual(pageContent(read('content/studio/pages/home.json')), clean(story.content))
})
test('all six unpublished videos retain their fields and publication state', () => {
  for (const story of drafts.filter(s => s.content.component === 'video')) {
    const doc = read('content/studio/videos/' + story.slug + '.json')
    assert.equal(doc.published, false)
    assert.equal(doc.storyId, story.id)
    const { slug, published, storyId, ...content } = doc
    assert.deepEqual(inflateContent(content), clean(story.content))
  }
})
test('shared invitation text is preserved', () => {
  const doc = read('content/studio/settings/site.json')
  const original = published.find(s => s.slug === 'site-settings').content
  assert.equal(doc.band_heading, original.band_heading)
  assert.equal(doc.band_button_text, original.band_button_text)
})
test('editing Markdown changes text and retains rich formatting', () => {
  const doc = read('content/studio/pages/film.json')
  const block = doc.sections[doc.sectionOrder[0]]
  block.text_markdown += '\n\nMigration **verification** with [a link](https://example.com/).'
  const result = pageContent(doc).body[0].body
  const serialized = JSON.stringify(result)
  assert.match(serialized, /Migration /)
  assert.match(serialized, /"type":"bold"/)
  assert.match(serialized, /https:\/\/example.com\//)
})
test('section ordering cannot silently discard an invalid reference', () => {
  const doc = read('content/studio/pages/home.json')
  doc.sectionOrder.push('missing')
  assert.throws(() => pageContent(doc), /Unknown page section/)
})

