import { videoInfo } from '../../utils/videos'
export default defineEventHandler(async event => {
  const story = await localVideo(String(getQuery(event).slug || ''))
  setResponseHeader(event, 'cache-control', 'private, no-store')
  return { story, info: await videoInfo(story), draft: !story.published }
})

