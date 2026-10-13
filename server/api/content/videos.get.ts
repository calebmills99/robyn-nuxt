import { videoInfo } from '../../utils/videos'
export default defineEventHandler(async event => {
  setResponseHeader(event, 'cache-control', 'private, no-store')
  const stories = await localVideos()
  return { videos: await Promise.all(stories.map(videoInfo)) }
})

