export default defineEventHandler(async event => {
  setResponseHeader(event, 'cache-control', 'private, no-store')
  return localDocument('settings/site.json')
})

