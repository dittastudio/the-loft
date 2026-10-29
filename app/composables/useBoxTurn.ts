import type { Ref } from 'vue'

import type { Mat3, Point, Vec3 } from '~/utils/boxTurn/geometry'
import {
  angleBetween,
  blend,
  cubicBezier,
  fitBox,
  fromAxisAngle,
  IDENTITY,
  multiply,
  range,
  smoothstep,
  SYMMETRIES,
  toAxisAngle,
  transpose,
  turn,
} from '~/utils/boxTurn/geometry'

interface ScrollOptions {
  sensitivity?: number // turns the box coasts for every 1000px scrolled
  swipeSensitivity?: number // the same for every 1000px a finger drags, as phones are smaller and swipes shorter
  friction?: number // fraction of its speed the box loses each second, 0-1
  maxSpeed?: number // turns per second, so a hard flick doesn't strobe
  response?: number // ms the spring landing it back on a face takes to swing once, and to take over from the coast
  bounce?: number // how far the landing spring overshoots, 0 for none
  morph?: number // how far from a face, as a fraction of a quarter turn, it starts easing back into the resting shape
  drift?: number // how far the image is dragged at a turn per second, as a fraction of its room to drift
}

interface BoxTurnOptions {
  shape: Point[] // resting clip in cell units (0-1), convex and around the centre
  scale?: number // room around the cell the turning box can use, which the image must cover
  drift?: number // how far the image moves towards the cursor at the edges of the viewport, as a fraction of the cell
  distance?: number // camera distance in box widths, lower is more perspective
  turns?: Point // turns the box makes with the cursor at the left/right and top/bottom edges of the viewport
  reach?: number // how far from the resting area towards the edge, as a fraction, the cursor goes before the box fully takes over the shape
  response?: number // ms the spring following the cursor takes to swing once, lower is snappier
  bounce?: number // how far the spring following the cursor overshoots, 0 for none
  leave?: number // ms the image takes to ease back, and the box into its resting shape, once the cursor leaves the window, which never overshoots
  duration?: number // ms a quarter spin takes, without a cursor
  rest?: number // ms between spins, without a cursor
  scroll?: ScrollOptions // how the box tumbles the way the page is scrolled
  surface?: Ref<HTMLElement | null> // where a sideways swipe can grab it by touch, as well as the box itself
  paused?: Ref<boolean> // while true, such as under a modal, it holds still and ignores input, carrying on once false
}

const GRAB_SLOP = 4 // px a press moves before it's a drag rather than a poke
const GRAB_SMOOTHING = 0.05 // seconds the speed of a held box takes to catch up with the pointer
const TURN_STEP = 1e-3 // seconds ahead the turn to the cursor is measured, to find how fast it's turning
const POKE_CENTRE = 0.2 // how near the centre, as a fraction of the way to the edge, a poke goes a random way
const FIRST_SPIN = 1200 // ms before the first spin, without a cursor
const SPIN_NEAR = 0.25 // radians from a face a click can still spin the box rather than poke it
const SETTLE = 700 // ms the spring easing a cancelled spin back to rest takes to swing once

// The ways the front sweeps on each spin in turn, as which way it goes around and over: top right to bottom left, bottom
// right to top left, bottom left to top right, then top left to bottom right.
const DIAGONALS: Point[] = [
  [-1, 1],
  [-1, -1],
  [1, -1],
  [1, 1],
]

// Gets going quickly and glides to a long, soft stop.
const easeSpin = cubicBezier(0.45, 0, 0.15, 1)

// Small fixed steps keep the motion the same at any frame rate.
const steps = (delta: number, step: (dt: number) => void) => {
  for (let left = delta / 1000; left > 0; left -= 1 / 120) {
    step(Math.min(left, 1 / 120))
  }
}

// Turns the outline of a 3D box inside `target`'s clip-path, resting on `shape`, over an `image` that overflows it, and
// springs it towards the cursor. The box rests while the cursor is over it, wherever it sits in the viewport, and the image
// drifts under it. Without a cursor it spins every so often instead. Either way, scrolling or swiping throws it into a
// tumble, and it can be grabbed and spun by hand, by touch with a sideways swipe across `surface`, or poked with a click.
export default function useBoxTurn(
  target: Ref<HTMLElement | null>,
  image: Ref<HTMLElement | null>,
  {
    shape,
    scale = 1.6,
    drift = 0.06,
    distance = 4,
    turns = [0.5, 0.5],
    reach = 0.2,
    response = 500,
    bounce = 0.3,
    leave = 1800,
    duration = 1200,
    rest = 4500,
    scroll = {},
    surface = target,
    paused = shallowRef(false),
  }: BoxTurnOptions,
) {
  // Cell units to a percentage of the cell, reaching outside it as the box turns.
  const toClipPath = (points: Point[]) =>
    `polygon(${points.map((p) => p.map((v) => `${+(v * 100).toFixed(3)}%`).join(' ')).join(', ')})`

  const restClip = toClipPath(shape)
  let lastClip = restClip

  const setClip = (clip: string) => {
    if (target.value && clip !== lastClip) {
      target.value.style.clipPath = lastClip = clip
    }
  }

  // Cell units to a percentage of the image, which is drawn at `scale` plus room to drift both ways.
  const toPercent = (drift / (scale + 2 * drift)) * 100

  const setDrift = (x: number, y: number) => {
    if (image.value) {
      image.value.style.transform =
        x || y ? `translate3d(${+(x * toPercent).toFixed(3)}%, ${+(y * toPercent).toFixed(3)}%, 0)` : ''
    }
  }

  // Blending is the costly part, so it only runs while easing between the two.
  const blendClip = (box: () => Point[], w: number) => {
    if (w <= 0) {
      return restClip
    }

    return toClipPath(w >= 1 ? box() : blend(shape, box(), w))
  }

  const reducedMotion = usePreferredReducedMotion()
  const canHover = useMediaQuery('(hover: hover) and (pointer: fine)')
  const isVisible = useElementVisibility(target)
  const { width: windowWidth, height: windowHeight } = useWindowSize({ listenOrientation: false })

  // Half the width and height of the box, and its centre in the viewport, measured as the cursor moves.
  const zone: Point = [0, 0]
  const centre: Point = [0, 0]

  const mode = computed(() => {
    if (reducedMotion.value === 'reduce') {
      return undefined
    }

    return canHover.value ? 'follow' : 'autoplay'
  })

  // Fitted the first time it's needed. A quarter turn on Y looks the same as no turn, but turning on X first doesn't, so
  // every pitch is checked.
  let box: ReturnType<typeof fitBox> | undefined
  const getBox = () =>
    (box ??= fitBox(
      range(0, Math.PI / 2, 12).flatMap((yaw) => range(-Math.PI, Math.PI, 48).map((pitch) => turn(yaw, pitch))),
      distance,
      scale,
    ))

  // Fitted while the browser is idle, so the first frame that turns the box doesn't pay for it.
  onMounted(() => {
    if (mode.value) {
      ;(window.requestIdleCallback ?? setTimeout)(() => getBox())
    }
  })

  // Where the cursor is from the centre of the box, -1 to 1 at the edges of the viewport, which the image drifts with,
  // then how far the box turns for it. The turn springs on its own, past the resting area, so it eases into rest in sight
  // rather than stopping dead at the edge of the box.
  type Aim = [number, number, number, number]
  const pointer: Aim = [0, 0, 0, 0]
  const current: Aim = [0, 0, 0, 0]
  const velocity: Aim = [0, 0, 0, 0]
  const isSettled = shallowRef(true)

  // A spring with unit mass, stiff enough to swing once every `response`, damped short of critical by `bounce`.
  const springOf = (ms: number, overshoot: number) => {
    const stiffness = ((2 * Math.PI) / (ms / 1000)) ** 2

    return { stiffness, damping: 2 * (1 - overshoot) * Math.sqrt(stiffness) }
  }

  // Snappy while following. Easing back it's slow and critically damped, so it eases out to rest without overshooting.
  // It keeps its speed when swapping, so either can take over mid-swing.
  const followSpring = springOf(response, bounce)
  const leaveSpring = springOf(leave, 0)
  let active = followSpring

  // Room from the box's centre to the edge of the viewport on the side `d` pixels away, as the box may sit off centre.
  const room = (d: number, axis: 0 | 1) =>
    Math.max(1, d >= 0 ? (axis ? windowHeight.value : windowWidth.value) - centre[axis] : centre[axis])

  // How far the cursor, `dx` and `dy` pixels from the box's centre, is past the box, -1 to 1 at the edges. Measured along
  // the line from the centre, rather than each way on its own, so the box only rests over itself and not in the bands
  // level with it.
  const pastZone = (dx: number, dy: number): Point => {
    // How much of that line is over the box.
    const over = Math.min(zone[0] / Math.abs(dx), zone[1] / Math.abs(dy))

    if (!(dx || dy) || over >= 1) {
      return [0, 0]
    }

    const past = (d: number, axis: 0 | 1) =>
      Math.min(1, Math.max(-1, (d * (1 - over)) / Math.max(1, room(d, axis) - zone[axis])))

    return [past(dx, 0), past(dy, 1)]
  }

  // Capped at the edges, as a held pointer can be dragged out past them.
  const moveTo = (dx: number, dy: number, using = followSpring) => {
    const toEdge = (d: number, axis: 0 | 1) => Math.min(1, Math.max(-1, d / room(d, axis)))
    pointer.splice(0, 4, toEdge(dx, 0), toEdge(dy, 1), ...pastZone(dx, dy))
    active = using
    isSettled.value = false
  }

  const spring = (delta: number) => {
    steps(delta, (dt) => {
      for (const i of [0, 1, 2, 3] as const) {
        velocity[i] += ((pointer[i] - current[i]) * active.stiffness - velocity[i] * active.damping) * dt
        current[i] += velocity[i] * dt
      }
    })

    // Close enough, and slow enough, that what remains is under a pixel.
    if (
      ([0, 1, 2, 3] as const).every((i) => Math.abs(pointer[i] - current[i]) < 1e-3 && Math.abs(velocity[i]) < 1e-2)
    ) {
      current.splice(0, 4, ...pointer)
      velocity.fill(0)
      isSettled.value = true
    }
  }

  // Scrolling throws the box against the way the page moves, rolling its front down as the page goes up and right as it
  // goes left, so it turns the way the fingers or wheel push, on top of however it's turned to the cursor. It coasts, slowing with `friction`, then a spring lands it on whichever face
  // it was heading for, taking over gradually so there's no tug. It's the cube's symmetry that lands, around the cursor's turn, so it settles looking untouched.
  const {
    sensitivity = 1,
    swipeSensitivity = 6,
    friction = 0.8,
    maxSpeed = 3,
    response: landResponse = 1000,
    bounce: landBounce = 0.05,
    morph = 0.5,
    drift: scrollDrift = 0.5,
  } = scroll

  // Speed falls by e^(-decay * t), so it coasts `speed / decay` radians before stopping.
  const decay = Math.max(1e-3, -Math.log(1 - Math.min(friction, 0.999)))
  const land = springOf(landResponse, landBounce)
  // Slow enough to cover no more than a quarter turn a swing, when the landing spring takes over.
  const landingSpeed = Math.PI / 2 / (landResponse / 1000)

  // Extra turn in screen space on top of the cursor's, and how fast it's turning, in radians a second around each axis.
  let tumble = IDENTITY
  const spinVelocity: Vec3 = [0, 0, 0]
  // The turn to the cursor last frame, so a change in it turns a tumbling box on the screen's axes, over the tumble, the
  // way the cursor moved, rather than on its own axes under it, which a tumble could turn the wrong way round.
  let lastAround: Mat3 | undefined
  let landing: Mat3 | undefined
  let landingTime = 0
  const isTumbling = shallowRef(false)
  // Let go too slowly to be thrown, it keeps its turned outline until it lands, as it does while held, rather than
  // snapping to the resting shape a slow tumble would have by then.
  let isLimp = false

  // The pointer holding the box, where it's been, and how far it's turned the box since the last frame.
  let grab:
    | { id: number; start: Point; last: Point; rect: DOMRect; isOnBox: boolean; moved: boolean; turned: Vec3 }
    | undefined

  // The symmetry that, around `around`, is closest to `orientation`. Turning both by the same rotation leaves the angle
  // between them alone, so `orientation` is brought back from around `around` once, rather than taking every symmetry
  // there, as this runs every frame of a tumble.
  const nearest = (orientation: Mat3, around: Mat3) => {
    const local = multiply(multiply(transpose(around), orientation), around)
    let best = IDENTITY
    let bestAngle = Infinity

    for (const symmetry of SYMMETRIES) {
      const angle = angleBetween(symmetry, local)

      if (angle < bestAngle) {
        best = symmetry
        bestAngle = angle
      }
    }

    return { symmetry: best, angle: bestAngle }
  }

  // How the box is turned to the cursor, or to where it's aiming at `[x, y]`.
  const facing = (x = current[2], y = current[3]) => turn(x * turns[0] * Math.PI * 2, y * turns[1] * Math.PI * 2)

  // A spin in progress hands over where it's got to, so a throw or a grab carries on from there. It spins the box on its
  // own axes, under its turn to the cursor, where a tumble turns it on the screen's, over it.
  const takeOver = () => {
    if (isSpinning.value) {
      const around = facing()
      tumble = multiply(tumble, multiply(multiply(around, spinPose), transpose(around)))
      isSpinning.value = false
      unschedule()
    }
  }

  const capSpeed = () => {
    const speed = Math.hypot(...spinVelocity)
    const cap = maxSpeed * Math.PI * 2

    if (speed > cap) {
      spinVelocity.forEach((v, i) => (spinVelocity[i] = (v / speed) * cap))
    }
  }

  const throwBox = (dx: number, dy: number, turnsPer1000 = sensitivity) => {
    if (!mode.value || !isVisible.value || grab || paused.value) {
      return
    }

    takeOver()

    const gain = (decay * turnsPer1000 * Math.PI * 2) / 1000
    spinVelocity[0] += dy * gain
    spinVelocity[1] += dx * gain
    capSpeed()

    // Fast enough that the outline no longer depends on it.
    if (Math.hypot(...spinVelocity) >= landingSpeed) {
      isLimp = false
    }

    landing = undefined
    isTumbling.value = true
  }

  const tumbling = (delta: number, around: Mat3) => {
    // Held, it only turns with the pointer. Its speed follows the pointer's, smoothed over `GRAB_SMOOTHING`, so letting go
    // throws it as fast as it was going and holding still lets it go limp.
    if (grab) {
      const { turned } = grab
      const t = delta / 1000
      const k = 1 - Math.exp(-t / GRAB_SMOOTHING)
      spinVelocity.forEach((v, i) => (spinVelocity[i] = v + (turned[i]! / Math.max(t, 1e-3) - v) * k))
      turned.fill(0)

      return
    }

    let target = IDENTITY

    steps(delta, (dt) => {
      // Aims for the face it would have coasted to, so a flick never gets pulled back, but no more than a quarter turn
      // ahead, or the spring would take the short way round, backwards.
      const speed = Math.hypot(...spinVelocity)

      if (!landing && speed < landingSpeed) {
        const ahead = speed && Math.min(1 / decay, Math.PI / 2 / speed)
        landing = nearest(multiply(fromAxisAngle(spinVelocity.map((v) => v * ahead) as Vec3), tumble), around).symmetry
        landingTime = 0
      }

      // Fades from friction into the spring over `response`, so the pull builds rather than kicking in.
      if (landing) {
        landingTime += dt
        const handover = smoothstep(Math.min(1, landingTime / (landResponse / 1000)))
        target = multiply(multiply(around, landing), transpose(around))
        const error = toAxisAngle(multiply(target, transpose(tumble)))
        spinVelocity.forEach(
          (v, i) =>
            (spinVelocity[i] =
              v + (handover * (error[i]! * land.stiffness - v * land.damping) - (1 - handover) * v * decay) * dt),
        )
      } else {
        spinVelocity.forEach((v, i) => (spinVelocity[i] = v * Math.exp(-decay * dt)))
      }

      tumble = multiply(fromAxisAngle(spinVelocity.map((v) => v * dt) as Vec3), tumble)
    })

    // Landed on a face, which looks the same as no extra turn at all.
    if (landing && angleBetween(target, tumble) < 1e-3 && Math.hypot(...spinVelocity) < 1e-2) {
      tumble = IDENTITY
      spinVelocity.fill(0)
      landing = undefined
      isLimp = false
      isTumbling.value = false
    }
  }

  // Shows the box tumbling on top of `around`, blending in the resting shape from `w` as it nears a face, and drags the
  // image the way it's spinning on top of `[x, y]`.
  const render = (around: Mat3, w: number, [x, y]: Point) => {
    if (isSpinning.value) {
      around = multiply(around, spinPose)
      w = Math.max(w, spinMorph)
      x = Math.min(1, Math.max(-1, x + spinArc * 0.5 * spin[0]))
      y = Math.min(1, Math.max(-1, y + spinArc * 0.5 * spin[1]))
    }

    if (isTumbling.value) {
      // Held still off a face it keeps its turned outline, rather than easing back as a slowing tumble would.
      const near = nearest(tumble, around).angle / (Math.PI / 2)
      w = Math.max(
        w,
        smoothstep(Math.min(1, near / morph, grab || isLimp ? 1 : Math.hypot(...spinVelocity) / landingSpeed)),
      )

      const pull = (v: number) => Math.tanh(v / (Math.PI * 2)) * scrollDrift
      x = Math.min(1, Math.max(-1, x + pull(spinVelocity[1])))
      y = Math.min(1, Math.max(-1, y + pull(spinVelocity[0])))
    }

    setClip(blendClip(() => getBox()(isTumbling.value ? multiply(tumble, around) : around), w))
    setDrift(x, y)
  }

  // The box's front turns to face the cursor, and the image drifts towards it.
  const following = (delta: number) => {
    if (!isSettled.value) {
      spring(delta)
    }

    const [, , x, y] = current
    const around = facing()

    // Turning the tumble by the same change, either side, carries the face it's landing on along with it too, so the
    // spring doesn't chase it.
    if (isTumbling.value && lastAround) {
      const change = multiply(around, transpose(lastAround))
      tumble = multiply(multiply(change, tumble), transpose(change))
    }

    lastAround = around

    if (isTumbling.value) {
      tumbling(delta, around)
    }

    let fade = 0

    if (isFading.value) {
      fadeTime += delta
      fade = fadeFrom * (1 - smoothstep(Math.min(1, fadeTime / leave)))
      isFading.value = fadeTime < leave
    }

    render(around, Math.max(fade, smoothstep(Math.min(1, Math.hypot(x, y) / reach))), [current[0], current[1]])
  }

  // Once the cursor leaves the window the box is let go where it's turned, as if it had been held there, rather than
  // turning back to the front. Like a box let go by hand, it coasts on at the speed it was turning and lands on the
  // nearest face, keeping its outline until it does, while the image eases back. Whatever outline it had for being
  // turned to the cursor fades over `leave`, in case it was already on a face.
  let fadeFrom = 0
  let fadeTime = 0
  const isFading = shallowRef(false)

  const leaveWindow = () => {
    client = undefined

    if (mode.value !== 'follow' || paused.value) {
      return
    }

    // Its turn to the cursor is handed to the tumble, along with how fast it was turning, on the screen's axes.
    const around = facing()
    const ahead = facing(current[2] + velocity[2] * TURN_STEP, current[3] + velocity[3] * TURN_STEP)
    const turning = toAxisAngle(multiply(multiply(tumble, multiply(ahead, transpose(around))), transpose(tumble)))
    spinVelocity.forEach((v, i) => (spinVelocity[i] = v + turning[i]! / TURN_STEP))
    tumble = multiply(tumble, around)

    fadeFrom = smoothstep(Math.min(1, Math.hypot(current[2], current[3]) / reach))
    fadeTime = 0
    isFading.value = fadeFrom > 0

    current[2] = current[3] = velocity[2] = velocity[3] = 0
    // Already handed to the tumble, so the jump back to the front isn't a turn of the cursor's.
    lastAround = undefined
    moveTo(0, 0, leaveSpring)

    capSpeed()
    landing = undefined
    isLimp = Math.hypot(...spinVelocity) < landingSpeed
    isTumbling.value = true
  }

  // Without a cursor, spin a three-quarter turn every so often, and with one, whenever the box is clicked. Every spin goes
  // diagonally, around and over at once, the next way in `DIAGONALS`, so the front sweeps from one corner to the other. A
  // cube looks the same every quarter turn, so it lands back on the resting shape without ever reversing, and the image
  // drifts the way the box is turning.
  const isSpinning = shallowRef(false)
  let spin = DIAGONALS[0]!
  let nextSpin = 0
  let spinPose = IDENTITY
  let spinArc = 0 // how far through, from 0 at either end to 1 halfway
  let spinMorph = 0 // how far from the resting shape
  let elapsed = 0
  let delay = FIRST_SPIN
  let progress = 0
  let settle: { to: number; speed: number } | undefined // cancelled, springing back to rest from `progress`

  // No overshoot, so it never swings past either end of the spin.
  const settleSpring = springOf(SETTLE, 0)

  const startSpin = () => {
    spin = DIAGONALS[nextSpin]!
    nextSpin = (nextSpin + 1) % DIAGONALS.length
    elapsed = 0
    settle = undefined
    isSpinning.value = true
  }

  // Cancelled mid-spin, it springs to whichever end is nearer, as both rest on the same shape, carrying on at the speed
  // it was going so it never jerks to a stop.
  const cancelSpin = () => {
    if (!isSpinning.value || settle) {
      return
    }

    const t = elapsed / (duration * 1.7)
    const speed = (easeSpin(Math.min(1, t + 1e-3)) - easeSpin(t)) / 1e-3 / ((duration * 1.7) / 1000)
    settle = { to: progress < 0.5 ? 0 : 1, speed }
  }

  const { start: schedule, stop: unschedule } = useTimeoutFn(startSpin, () => delay, { immediate: false })

  const spinning = (delta: number) => {
    let isDone: boolean

    if (settle) {
      const { to } = settle
      steps(delta, (dt) => {
        settle!.speed += ((to - progress) * settleSpring.stiffness - settle!.speed * settleSpring.damping) * dt
        progress += settle!.speed * dt

        // Stopped at either end, as going past would turn it beyond where it rests.
        if (progress < 0 || progress > 1) {
          progress = Math.min(1, Math.max(0, progress))
          settle!.speed = 0
        }
      })
      isDone = Math.abs(to - progress) < 1e-3 && Math.abs(settle.speed) < 1e-2

      if (isDone) {
        progress = to
      }
    } else {
      elapsed += delta
      const t = Math.min(1, elapsed / (duration * 1.7))
      progress = easeSpin(t)
      isDone = t >= 1
    }

    const angle = progress * 0.75 * Math.PI * 2
    spinPose = turn(spin[0] * angle, spin[1] * angle)
    spinArc = isDone ? 0 : Math.max(0, Math.sin(Math.PI * progress))
    spinMorph = smoothstep(Math.max(0, Math.min(1, progress / 0.2, (1 - progress) / 0.2)))

    if (isDone) {
      isSpinning.value = false
      settle = undefined

      if (mode.value === 'autoplay') {
        delay = rest
        schedule()
      }
    }
  }

  // Start after a short wait. A spin cut short by scrolling away finishes first, and the next one carries on the sequence.
  watch(
    () => mode.value === 'autoplay' && isVisible.value && !isTumbling.value && !paused.value,
    (isPlaying) => {
      if (!isPlaying) {
        unschedule()
      } else if (!isSpinning.value) {
        delay = FIRST_SPIN
        schedule()
      }
    },
  )

  // Hidden tabs get no frames anyway, so only being offscreen or paused needs checking. Otherwise frames only run while the
  // spring is settling or the box is spinning or tumbling.
  const canRun = computed(
    () =>
      !paused.value &&
      isVisible.value &&
      (isTumbling.value || isSpinning.value || (mode.value === 'follow' && (!isSettled.value || isFading.value))),
  )

  const { pause, resume } = useRafFn(
    ({ delta }) => {
      // Cap the step so returning to a background tab doesn't cause a jump.
      const step = Math.min(delta, 50)

      if (isSpinning.value) {
        spinning(step)
      }

      if (mode.value === 'follow') {
        following(step)
      } else {
        if (isTumbling.value) {
          tumbling(step, IDENTITY)
        }

        render(IDENTITY, 0, [0, 0])
      }
    },
    { immediate: false },
  )

  // Paused from here rather than inside the frame, where the loop has already queued its next one.
  watch(canRun, (isRunning) => (isRunning ? resume() : pause()))

  watch(mode, () => {
    isSpinning.value = false
    isTumbling.value = false
    tumble = IDENTITY
    spinVelocity.fill(0)
    landing = undefined
    isLimp = false
    isFading.value = false
    grab = undefined
    pointer.fill(0)
    current.fill(0)
    velocity.fill(0)
    isSettled.value = true
    setClip(restClip)
    setDrift(0, 0)
  })

  // Last cursor position, so scrolling the box under a still cursor counts too.
  let client: Point | undefined

  // Held, the box stays turned to wherever the cursor was when it was grabbed.
  const follow = () => {
    if (mode.value !== 'follow' || !client || !target.value || grab || paused.value) {
      return
    }

    const rect = target.value.getBoundingClientRect()
    zone[0] = rect.width / 2
    zone[1] = rect.height / 2
    centre[0] = rect.left + zone[0]
    centre[1] = rect.top + zone[1]

    moveTo(client[0] - centre[0], client[1] - centre[1])
  }

  useEventListener(
    'pointermove',
    (event: PointerEvent) => {
      client = [event.clientX, event.clientY]

      // Let go somewhere the release never arrived, like outside the window.
      if (grab && event.pointerId === grab.id && !(event.buttons & 1)) {
        release(event, 'lost')
      }

      follow()
    },
    { passive: true },
  )

  // Wheels and trackpads, with a cursor, which also catch sideways swipes and swipes past the top of the page. Lines and
  // pages are roughly converted to pixels.
  // Not pinching to zoom, or scrolling an open dialog.
  useEventListener(
    'wheel',
    (event: WheelEvent) => {
      if (mode.value === 'follow' && !event.ctrlKey && !(event.target as Element | null)?.closest?.('dialog')) {
        const unit = [1, 16, windowHeight.value][event.deltaMode] ?? 1
        throwBox(event.deltaX * unit, event.deltaY * unit)
      }
    },
    { passive: true },
  )

  useEventListener('scroll', follow, { passive: true })

  // Without one, how far a finger drags, whether or not the page scrolls with it. Dragging up moves things up, as
  // scrolling down does.
  let touch: Point | undefined

  useEventListener(
    'touchstart',
    (event: TouchEvent) => {
      const finger = event.touches[0]
      touch =
        event.touches.length === 1 && finger && !(event.target as Element | null)?.closest?.('dialog')
          ? [finger.clientX, finger.clientY]
          : undefined
    },
    { passive: true },
  )

  useEventListener(
    'touchmove',
    (event: TouchEvent) => {
      const finger = event.touches[0]

      if (mode.value === 'autoplay' && touch && finger && !grab) {
        throwBox(touch[0] - finger.clientX, touch[1] - finger.clientY, swipeSensitivity)
        touch = [finger.clientX, finger.clientY]
      }
    },
    { passive: true },
  )

  // Leaving the window, which is the only time there's nothing on the other side.
  useEventListener(
    'pointerout',
    (event: PointerEvent) => {
      if (mode.value === 'follow' && !event.relatedTarget && !grab) {
        leaveWindow()
      }
    },
    { passive: true },
  )

  // Grabbing the box stops it dead, and it turns with the pointer as if its front were stuck to it, a quarter turn for
  // every width dragged. Only sideways drags grab it by touch, so the page still scrolls, and they can start anywhere on
  // `surface`, not just the box, as there's nothing else for them to do. A click or tap on the box without a drag spins
  // it, or, mid-tumble, pokes it instead, rolling it a quarter turn away the way a real box would go, around a random
  // way if it's hit dead centre.
  const startGrab = (event: PointerEvent, start: Point, isOnBox: boolean) => {
    if (!target.value) {
      return
    }

    takeOver()
    grab = {
      id: event.pointerId,
      start,
      last: start,
      rect: target.value.getBoundingClientRect(),
      isOnBox,
      moved: false,
      turned: [0, 0, 0],
    }
    spinVelocity.fill(0)
    landing = undefined
    isTumbling.value = true
  }

  const canGrab = (event: PointerEvent) =>
    mode.value && isVisible.value && event.isPrimary && event.button === 0 && !grab

  useEventListener(target, 'pointerdown', (event: PointerEvent) => {
    if (!canGrab(event) || !target.value) {
      return
    }

    // Kept from the surface, which this would otherwise bubble up to.
    pending = undefined

    if (event.pointerType === 'mouse') {
      event.preventDefault()
    }

    // Held outside the window too.
    target.value.setPointerCapture(event.pointerId)

    // Mid-spin, a click or tap cancels it, so it only takes the box once it's dragged.
    if (isSpinning.value) {
      pending = { id: event.pointerId, start: [event.clientX, event.clientY], isOnBox: true }

      return
    }

    target.value.style.cursor = 'grabbing'
    startGrab(event, [event.clientX, event.clientY], true)
  })

  // Off the box, a touch only takes it once it's moved, as the browser cancels it first if it's a scroll, which then
  // leaves the box spinning.
  let pending: { id: number; start: Point; isOnBox: boolean } | undefined

  useEventListener(surface, 'pointerdown', (event: PointerEvent) => {
    if (canGrab(event) && event.pointerType !== 'mouse' && !target.value?.contains(event.target as Node | null)) {
      pending = { id: event.pointerId, start: [event.clientX, event.clientY], isOnBox: false }
    }
  })

  useEventListener(
    'pointermove',
    (event: PointerEvent) => {
      if (
        pending?.id === event.pointerId &&
        Math.hypot(event.clientX - pending.start[0], event.clientY - pending.start[1]) >= GRAB_SLOP
      ) {
        startGrab(event, pending.start, pending.isOnBox)
        pending = undefined
      }

      if (!grab || event.pointerId !== grab.id) {
        return
      }

      if (!grab.moved && Math.hypot(event.clientX - grab.start[0], event.clientY - grab.start[1]) < GRAB_SLOP) {
        return
      }

      // Down rolls the front down and right turns it right.
      const gain = Math.PI / 2 / Math.max(1, grab.rect.width)
      const turned: Vec3 = [(event.clientY - grab.last[1]) * gain, (event.clientX - grab.last[0]) * gain, 0]
      tumble = multiply(fromAxisAngle(turned), tumble)
      grab.turned = grab.turned.map((v, i) => v + turned[i]!) as Vec3
      grab.last = [event.clientX, event.clientY]
      grab.moved = true
    },
    { passive: true },
  )

  // Let go with a release, a cancel when the browser takes over, or the pointer lost some other way, whose position can't
  // be trusted, so it's only ever thrown and never pokes.
  const release = (event: PointerEvent, how: 'up' | 'cancel' | 'lost' = 'up') => {
    if (pending?.id === event.pointerId) {
      if (how === 'up' && pending.isOnBox) {
        cancelSpin()
      }

      pending = undefined
    }

    if (!grab || event.pointerId !== grab.id) {
      return
    }

    const { moved, rect, isOnBox } = grab
    const [x, y] = how === 'lost' ? (client ?? grab.last) : [event.clientX, event.clientY]
    grab = undefined

    if (target.value) {
      target.value.style.cursor = ''
    }

    if (how === 'cancel') {
      spinVelocity.fill(0)
    }
    // Clicked or tapped at rest, or all but landed after a throw, it spins the next way, as it does without a cursor. Any face looks
    // the same at rest, so the face it's nearly on becomes the front, and what's left of the landing settles under the spin.
    else if (!moved && how === 'up' && isOnBox && nearest(tumble, facing()).angle < SPIN_NEAR) {
      const around = facing()
      const face = multiply(multiply(around, nearest(tumble, around).symmetry), transpose(around))
      tumble = multiply(tumble, transpose(face))

      if (angleBetween(tumble, IDENTITY) < 1e-3) {
        tumble = IDENTITY
        isTumbling.value = false
      }

      startSpin()
    } else if (!moved && how === 'up' && isOnBox) {
      // The front rolls the way the poked edge does as it's pushed away, so from the centre out to where it was poked.
      const px = (x - (rect.left + rect.width / 2)) / Math.max(1, rect.width / 2)
      const py = (y - (rect.top + rect.height / 2)) / Math.max(1, rect.height / 2)
      const off = Math.hypot(px, py)
      const way: Point =
        off < POKE_CENTRE
          ? Math.random() < 0.5
            ? [Math.sign(Math.random() - 0.5), 0]
            : [0, Math.sign(Math.random() - 0.5)]
          : [py / off, px / off]
      // Fast enough to coast a quarter turn before it lands.
      const speed = (Math.PI / 2) * decay
      spinVelocity.splice(0, 3, way[0] * speed, way[1] * speed, 0)
    }

    capSpeed()
    landing = undefined
    isLimp = Math.hypot(...spinVelocity) < landingSpeed

    // Dragged out of the window, it's let go as if the cursor had just left, which it did while held.
    if (mode.value === 'follow' && (x < 0 || y < 0 || x >= windowWidth.value || y >= windowHeight.value)) {
      leaveWindow()
    } else {
      follow()
    }
  }

  // Listened for on the window, whatever was grabbed. A cancel is the browser taking over to scroll the page, which
  // throws it on its own. A lost capture is it gone without a release, which some browsers do when it's let go outside
  // the window, and is a no-op after one.
  useEventListener('pointerup', (event: PointerEvent) => release(event), { passive: true })
  useEventListener('pointercancel', (event: PointerEvent) => release(event, 'cancel'), { passive: true })
  useEventListener('lostpointercapture', (event: PointerEvent) => release(event, 'lost'), { passive: true })

  return restClip
}
