import type { Ref } from 'vue'

interface BounceOptions {
  speed?: number // px per second
}

// Moves `target` around inside `container` in straight lines, bouncing off the edges.
export default function useBounce(
  target: Ref<HTMLElement | null>,
  container: Ref<HTMLElement | null>,
  { speed = 60 }: BounceOptions = {},
) {
  const isReady = ref<boolean>(false)

  let frame = 0
  let lastTime = 0
  let x = 0
  let y = 0
  let vx = 0
  let vy = 0
  let maxX = 0
  let maxY = 0

  const measure = () => {
    if (!target.value || !container.value) {
      return
    }

    maxX = Math.max(0, container.value.clientWidth - target.value.offsetWidth)
    maxY = Math.max(0, container.value.clientHeight - target.value.offsetHeight)
    x = Math.min(x, maxX)
    y = Math.min(y, maxY)
  }

  const render = () => {
    if (target.value) {
      target.value.style.transform = `translate3d(${x}px, ${y}px, 0)`
    }
  }

  const tick = (time: number) => {
    // Cap the step so returning to a background tab doesn't cause a jump.
    const delta = Math.min((time - (lastTime || time)) / 1000, 0.05)
    lastTime = time

    x += vx * delta
    y += vy * delta

    if (x <= 0 || x >= maxX) {
      vx *= -1
      x = Math.min(Math.max(x, 0), maxX)
    }

    if (y <= 0 || y >= maxY) {
      vy *= -1
      y = Math.min(Math.max(y, 0), maxY)
    }

    render()
    frame = requestAnimationFrame(tick)
  }

  let observer: ResizeObserver | undefined

  onMounted(() => {
    measure()

    x = Math.random() * maxX
    y = Math.random() * maxY

    const angle = (Math.PI / 4) + (Math.floor(Math.random() * 4) * (Math.PI / 2)) // a random diagonal
    vx = Math.cos(angle) * speed
    vy = Math.sin(angle) * speed

    render()
    isReady.value = true

    observer = new ResizeObserver(measure)

    if (container.value) {
      observer.observe(container.value)
    }

    if (target.value) {
      observer.observe(target.value)
    }

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      frame = requestAnimationFrame(tick)
    }
  })

  onUnmounted(() => {
    cancelAnimationFrame(frame)
    observer?.disconnect()
  })

  return isReady
}
