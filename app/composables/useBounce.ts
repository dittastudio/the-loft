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
  const isReady = shallowRef<boolean>(false)

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

    // The container can't shrink below its content, so cap to the viewport to keep the target on screen.
    const height = Math.min(container.value.clientHeight, window.innerHeight)

    maxX = Math.max(0, container.value.clientWidth - target.value.offsetWidth)
    maxY = Math.max(0, height - target.value.offsetHeight)
    x = Math.min(x, maxX)
    y = Math.min(y, maxY)
  }

  const render = () => {
    if (target.value) {
      target.value.style.transform = `translate3d(${x}px, ${y}px, 0)`
    }
  }

  const reducedMotion = usePreferredReducedMotion()
  const isVisible = useElementVisibility(container)

  const { pause, resume } = useRafFn(({ delta }) => {
    // Cap the step so returning to a background tab doesn't cause a jump.
    const step = Math.min(delta / 1000, 0.05)

    x += vx * step
    y += vy * step

    if (x <= 0 || x >= maxX) {
      vx *= -1
      x = Math.min(Math.max(x, 0), maxX)
    }

    if (y <= 0 || y >= maxY) {
      vy *= -1
      y = Math.min(Math.max(y, 0), maxY)
    }

    render()
  }, { immediate: false })

  // Hidden tabs get no frames anyway, so only being offscreen needs checking.
  watch(() => isReady.value && isVisible.value && reducedMotion.value !== 'reduce', isRunning => isRunning ? resume() : pause())

  useResizeObserver([container, target], measure)
  useEventListener('resize', measure, { passive: true })

  onMounted(() => {
    measure()

    x = Math.random() * maxX
    y = Math.random() * maxY

    const angle = (Math.PI / 4) + (Math.floor(Math.random() * 4) * (Math.PI / 2)) // a random diagonal
    vx = Math.cos(angle) * speed
    vy = Math.sin(angle) * speed

    render()
    isReady.value = true
  })

  return isReady
}
