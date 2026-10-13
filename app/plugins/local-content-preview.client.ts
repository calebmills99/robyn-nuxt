export default defineNuxtPlugin(() => {
  if (!import.meta.dev || !import.meta.hot) return
  let timer: ReturnType<typeof setTimeout>
  import.meta.hot.on('nuxt-content:update', () => {
    clearTimeout(timer)
    timer = setTimeout(() => refreshNuxtData(), 350)
  })
})

