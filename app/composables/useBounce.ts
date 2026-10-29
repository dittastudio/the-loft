import type { Ref } from 'vue'

interface BounceOptions {
  speed?: number // px per second
}

// Moves `target` around the viewport in straight lines, bouncing off the edges. Each axis is its own endless back and
// forth animation, `translate` for across and `transform` for down so they don't fight, which the compositor runs
// without any work on the main thread per frame.
export default function useBounce(target: Ref<HTMLElement | null>, { speed = 60 }: BounceOptions = {}) {
  const isReady = shallowRef<boolean>(false)

  let maxX = 0
  let maxY = 0
  let vx = 0 // px per second across, always positive; the way it starts is in the animation's phase
  let vy = 0 // px per second down, likewise

  let across: Animation | undefined
  let down: Animation | undefined

  const acrossFrames = (x: number): Keyframe[] => [{ translate: '0px 0px' }, { translate: `${x}px 0px` }]
  const downFrames = (y: number): Keyframe[] => [{ transform: 'translateY(0px)' }, { transform: `translateY(${y}px)` }]

  // ms to cross the viewport one way, kept above 0 for when the target is as big as the viewport.
  const durationOf = (max: number, v: number) => Math.max(1, (max / v) * 1000)

  // Where an animation is through a there-and-back, 0 to 2, so it can carry on from the same place and way.
  const phaseOf = (animation: Animation) => {
    const duration = Number(animation.effect?.getTiming().duration) || 1

    return (Number(animation.currentTime) % (2 * duration)) / duration
  }

  const retime = (animation: Animation | undefined, frames: Keyframe[], duration: number) => {
    if (!animation) {
      return
    }

    const phase = phaseOf(animation)
    const effect = animation.effect as KeyframeEffect

    effect.setKeyframes(frames)
    effect.updateTiming({ duration })
    animation.currentTime = phase * duration
  }

  const measure = () => {
    if (!target.value) {
      return
    }

    // clientWidth/Height of the root leave out any scrollbar.
    maxX = Math.max(0, document.documentElement.clientWidth - target.value.offsetWidth)
    maxY = Math.max(0, document.documentElement.clientHeight - target.value.offsetHeight)

    retime(across, acrossFrames(maxX), durationOf(maxX, vx))
    retime(down, downFrames(maxY), durationOf(maxY, vy))
  }

  // Starts `fraction` of the way across, heading forwards or back, by where it sits in the there-and-back.
  const start = (el: HTMLElement, frames: Keyframe[], duration: number, fraction: number, isForwards: boolean) => {
    const animation = el.animate(frames, {
      duration,
      iterations: Infinity,
      direction: 'alternate',
      easing: 'linear',
    })

    animation.currentTime = (isForwards ? fraction : 2 - fraction) * duration

    return animation
  }

  const reducedMotion = usePreferredReducedMotion()

  // Hidden tabs don't animate anyway, and the target is always on screen.
  watch(
    () => isReady.value && reducedMotion.value !== 'reduce',
    (isRunning) => {
      for (const animation of [across, down]) {
        if (isRunning) {
          animation?.play()
        } else {
          animation?.pause()
        }
      }
    },
  )

  useResizeObserver(target, measure)
  useEventListener('resize', measure, { passive: true })

  onMounted(() => {
    const el = target.value

    if (!el) {
      return
    }

    measure()

    const angle = Math.PI / 4 + Math.floor(Math.random() * 4) * (Math.PI / 2) // a random diagonal
    vx = Math.abs(Math.cos(angle)) * speed
    vy = Math.abs(Math.sin(angle)) * speed

    across = start(el, acrossFrames(maxX), durationOf(maxX, vx), Math.random(), Math.cos(angle) > 0)
    down = start(el, downFrames(maxY), durationOf(maxY, vy), Math.random(), Math.sin(angle) > 0)

    // Held at its random start until reduced motion is known not to be on.
    if (reducedMotion.value === 'reduce') {
      across.pause()
      down.pause()
    }

    isReady.value = true
  })

  onBeforeUnmount(() => {
    across?.cancel()
    down?.cancel()
  })

  return isReady
}
