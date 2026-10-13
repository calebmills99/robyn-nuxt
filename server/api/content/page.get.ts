export default defineEventHandler(async event => {
  const q = getQuery(event)
  setResponseHeader(event, 'cache-control', 'private, no-store')
  return localPage(String(q.slug || ''), q.draft === '1')
})

