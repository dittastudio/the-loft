import type { Ref } from 'vue'

type Point = [number, number]
type Vec3 = [number, number, number]
type Mat3 = [number, number, number, number, number, number, number, number, number] // row by row

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
  duration?: number // ms a quarter spin takes, without a cursor
  tilt?: number // degrees the box lifts mid-spin, without a cursor
  rest?: Point // shortest and longest ms between spins, without a cursor
  scroll?: ScrollOptions // how the box tumbles the way the page is scrolled
}

const CENTRE: Point = [0.5, 0.5]
const SAMPLES = 96

const smoothstep = (t: number) => t * t * (3 - 2 * t)

// CSS's cubic-bezier() timing function, solved for `x` by bisection.
const cubicBezier = (x1: number, y1: number, x2: number, y2: number) => {
  const at = (a: number, b: number, t: number) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3

  return (x: number) => {
    let lo = 0
    let hi = 1

    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2

      if (at(x1, x2, mid) < x) {
        lo = mid
      }
      else {
        hi = mid
      }
    }

    return at(y1, y2, (lo + hi) / 2)
  }
}

// Gets going quickly and glides to a long, soft stop.
const easeSpin = cubicBezier(0.45, 0, 0.15, 1)

const CUBE: Vec3[] = [-0.5, 0.5].flatMap(x => [-0.5, 0.5].flatMap(y => [-0.5, 0.5].map(z => [x, y, z] as Vec3)))

// Monotone chain, returns the hull in screen order.
const hull = (points: Point[]): Point[] => {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o: Point, a: Point, b: Point) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const half = (list: Point[]) => {
    const out: Point[] = []

    for (const p of list) {
      while (out.length >= 2 && cross(out[out.length - 2]!, out[out.length - 1]!, p) <= 0) {
        out.pop()
      }

      out.push(p)
    }

    return out.slice(0, -1)
  }

  return [...half(sorted), ...half([...sorted].reverse())]
}

const IDENTITY: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1]

const multiply = (a: Mat3, b: Mat3) => IDENTITY.map((_, i) => {
  const row = Math.floor(i / 3) * 3
  const col = i % 3

  return a[row]! * b[col]! + a[row + 1]! * b[col + 3]! + a[row + 2]! * b[col + 6]!
}) as Mat3

// Its inverse, as it's a rotation.
const transpose = (m: Mat3): Mat3 => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]]

// Turns |v| radians around `v`.
const fromAxisAngle = ([x, y, z]: Vec3): Mat3 => {
  const angle = Math.hypot(x, y, z)

  if (angle < 1e-12) {
    return IDENTITY
  }

  const [ux, uy, uz] = [x / angle, y / angle, z / angle]
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  const t = 1 - c

  return [
    t * ux * ux + c, t * ux * uy - s * uz, t * ux * uz + s * uy,
    t * ux * uy + s * uz, t * uy * uy + c, t * uy * uz - s * ux,
    t * ux * uz - s * uy, t * uy * uz + s * ux, t * uz * uz + c,
  ]
}

// The other way, for turns short of a half, which is all landing on the nearest face ever needs.
const toAxisAngle = (m: Mat3): Vec3 => {
  const angle = Math.acos(Math.min(1, Math.max(-1, (m[0] + m[4] + m[8] - 1) / 2)))
  const s = Math.sin(angle)

  if (s < 1e-9) {
    return [0, 0, 0]
  }

  const k = angle / (2 * s)

  return [(m[7] - m[5]) * k, (m[2] - m[6]) * k, (m[3] - m[1]) * k]
}

const angleBetween = (a: Mat3, b: Mat3) => Math.hypot(...toAxisAngle(multiply(a, transpose(b))))

// Turns on its vertical axis then leans the top towards the camera on its horizontal one.
const turn = (yaw: number, pitch: number) => multiply(fromAxisAngle([pitch, 0, 0]), fromAxisAngle([0, yaw, 0]))

// The 24 ways a cube can be turned and look the same: each axis onto another, either way round, without mirroring.
const SYMMETRIES = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]].flatMap(order => [1, -1].flatMap(a => [1, -1].flatMap(b => [1, -1].map((c) => {
  const m = [0, 0, 0, 0, 0, 0, 0, 0, 0] as Mat3;
  [a, b, c].forEach((sign, row) => m[row * 3 + order[row]!] = sign)

  return m
})))).filter(m => m[0] * (m[4] * m[8] - m[5] * m[7]) - m[1] * (m[3] * m[8] - m[5] * m[6]) + m[2] * (m[3] * m[7] - m[4] * m[6]) > 0)

// Distance from the centre to the edge of a convex polygon along `angle`.
const radius = (polygon: Point[], angle: number) => {
  const dx = Math.cos(angle)
  const dy = Math.sin(angle)
  let best = Infinity

  polygon.forEach((a, i) => {
    const b = polygon[(i + 1) % polygon.length]!
    const ex = b[0] - a[0]
    const ey = b[1] - a[1]
    const denom = dx * ey - dy * ex

    if (Math.abs(denom) < 1e-9) {
      return
    }

    const ax = a[0] - CENTRE[0]
    const ay = a[1] - CENTRE[1]
    const t = (ax * ey - ay * ex) / denom
    const u = (ax * dy - ay * dx) / denom

    if (t > 0 && u >= -1e-9 && u <= 1 + 1e-9) {
      best = Math.min(best, t)
    }
  })

  return best === Infinity ? 0 : best
}

const angleOf = (p: Point) => Math.atan2(p[1] - CENTRE[1], p[0] - CENTRE[0])

// Blends two convex shapes by their distance from the centre, so they don't need matching vertices.
const blend = (from: Point[], to: Point[], w: number): Point[] => {
  const angles = [
    ...Array.from({ length: SAMPLES }, (_, i) => (i / SAMPLES) * Math.PI * 2 - Math.PI),
    ...from.map(angleOf),
    ...to.map(angleOf),
  ].sort((a, b) => a - b)

  return angles.map((angle) => {
    const r = radius(from, angle) * (1 - w) + radius(to, angle) * w

    return [CENTRE[0] + Math.cos(angle) * r, CENTRE[1] + Math.sin(angle) * r]
  })
}

// Outline of the box turned by `rotation`, centred on the origin.
const projectBox = (rotation: Mat3, distance: number): Point[] => {
  const m = rotation
  const points = CUBE.map(([x, y, z]): Point => {
    const perspective = distance / (distance - (m[6] * x + m[7] * y + m[8] * z))

    return [(m[0] * x + m[1] * y + m[2] * z) * perspective, -(m[3] * x + m[4] * y + m[5] * z) * perspective]
  })

  return hull(points)
}

// Centres the face-on box in the cell and fits it, so it lines up with `shape` as it settles, without ever outgrowing the
// image in any of `orientations`.
const fitBox = (orientations: Mat3[], distance: number, scale: number) => {
  const faceOn = projectBox(IDENTITY, distance)
  const xs = faceOn.map(p => p[0])
  const ys = faceOn.map(p => p[1])
  const offsetX = (Math.max(...xs) + Math.min(...xs)) / 2
  const offsetY = (Math.max(...ys) + Math.min(...ys)) / 2
  const extent = (points: Point[]) => Math.max(...points.flatMap(([x, y]) => [Math.abs(x - offsetX), Math.abs(y - offsetY)]))
  const maxExtent = Math.max(...orientations.map(rotation => extent(projectBox(rotation, distance))))
  const fit = Math.min(1 / Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)), (0.49 * scale) / maxExtent)

  return (rotation: Mat3) => projectBox(rotation, distance)
    .map(([x, y]): Point => [CENTRE[0] + (x - offsetX) * fit, CENTRE[1] + (y - offsetY) * fit])
}

const range = (from: number, to: number, steps: number) => Array.from({ length: steps + 1 }, (_, i) => from + ((to - from) * i) / steps)
const random = ([min, max]: Point) => min + Math.random() * (max - min)

// Turns the outline of a 3D box inside `target`'s clip-path, resting on `shape`, over an `image` that overflows it, and
// springs it towards the cursor. The box rests while the cursor is over it, wherever it sits in the viewport, and the image
// drifts under it. Without a cursor it spins every so often instead. Either way, scrolling or swiping throws it into a
// tumble.
export default function useBoxTurn(
  target: Ref<HTMLElement | null>,
  image: Ref<HTMLElement | null>,
  { shape, scale = 1.6, drift = 0.06, distance = 4, turns = [0.5, 0.5], reach = 0.2, response = 500, bounce = 0.3, duration = 1700, tilt = 12, rest = [3000, 6000], scroll = {} }: BoxTurnOptions,
) {
  // Cell units to a percentage of the cell, reaching outside it as the box turns.
  const toClipPath = (points: Point[]) => `polygon(${points
    .map(p => p.map(v => `${+(v * 100).toFixed(3)}%`).join(' '))
    .join(', ')})`

  const restClip = toClipPath(shape)
  let lastClip = restClip

  const setClip = (clip: string) => {
    if (target.value && clip !== lastClip) {
      target.value.style.clipPath = lastClip = clip
    }
  }

  // Cell units to a percentage of the image, which is drawn at `scale` plus room to drift both ways.
  const setDrift = (x: number, y: number) => {
    if (image.value) {
      const toPercent = (drift / (scale + 2 * drift)) * 100
      image.value.style.transform = x || y ? `translate3d(${+(x * toPercent).toFixed(3)}%, ${+(y * toPercent).toFixed(3)}%, 0)` : ''
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

  // Half the width of the box, and its centre in the viewport, measured as the cursor moves.
  let zone = 0
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
  const getBox = () => box ??= fitBox(range(0, Math.PI / 2, 12).flatMap(yaw => range(-Math.PI, Math.PI, 48).map(pitch => turn(yaw, pitch))), distance, scale)

  // Where the cursor is from the centre of the box, -1 to 1 at the edges of the viewport.
  const pointer: Point = [0, 0]
  const current: Point = [0, 0]
  const velocity: Point = [0, 0]
  const isSettled = shallowRef(true)

  const moveTo = (x: number, y: number) => {
    pointer[0] = x
    pointer[1] = y
    isSettled.value = false
  }

  // A spring with unit mass, stiff enough to swing once every `response`, damped short of critical by `bounce`.
  const stiffness = ((2 * Math.PI) / (response / 1000)) ** 2
  const damping = 2 * (1 - bounce) * Math.sqrt(stiffness)

  // Room from the box's centre to the edge of the viewport on the side of `position`, as the box may sit off centre.
  const side = (position: number, from: number, size: number) => position >= 0 ? size - from : from

  // How far `position` is past the resting area, -1 to 1 at the edges.
  const pastZone = (position: number, from: number, size: number) => {
    const room = side(position, from, size)

    return (Math.sign(position) * Math.max(0, Math.abs(position) * room - zone)) / Math.max(1, room - zone)
  }

  const spring = (delta: number) => {
    // Small fixed steps keep the spring the same at any frame rate.
    for (let left = delta / 1000; left > 0; left -= 1 / 120) {
      const dt = Math.min(left, 1 / 120)

      for (const i of [0, 1] as const) {
        velocity[i] += ((pointer[i] - current[i]) * stiffness - velocity[i] * damping) * dt
        current[i] += velocity[i] * dt
      }
    }

    // Close enough, and slow enough, that what remains is under a pixel.
    if (([0, 1] as const).every(i => Math.abs(pointer[i] - current[i]) < 1e-3 && Math.abs(velocity[i]) < 1e-2)) {
      current[0] = pointer[0]
      current[1] = pointer[1]
      velocity[0] = velocity[1] = 0
      isSettled.value = true
    }
  }

  // Scrolling throws the box the way the page moves, rolling its front up as the page goes up and left as it goes left, on
  // top of however it's turned to the cursor. It coasts, slowing with `friction`, then a spring lands it on whichever face
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
  const landStiffness = ((2 * Math.PI) / (landResponse / 1000)) ** 2
  const landDamping = 2 * (1 - landBounce) * Math.sqrt(landStiffness)
  // Slow enough to cover no more than a quarter turn a swing, when the landing spring takes over.
  const landingSpeed = (Math.PI / 2) / (landResponse / 1000)

  // Extra turn in screen space on top of the cursor's, and how fast it's turning, in radians a second around each axis.
  let tumble = IDENTITY
  const spinVelocity: Vec3 = [0, 0, 0]
  let landing: Mat3 | undefined
  let landingTime = 0
  const isTumbling = shallowRef(false)

  // The symmetry that, around `around`, is closest to `orientation`.
  const nearest = (orientation: Mat3, around: Mat3) => {
    let best = IDENTITY
    let bestAngle = Infinity

    for (const symmetry of SYMMETRIES) {
      const angle = angleBetween(multiply(multiply(around, symmetry), transpose(around)), orientation)

      if (angle < bestAngle) {
        best = symmetry
        bestAngle = angle
      }
    }

    return { symmetry: best, angle: bestAngle }
  }

  const throwBox = (dx: number, dy: number, turnsPer1000 = sensitivity) => {
    if (!mode.value || !isVisible.value) {
      return
    }

    // A spin in progress hands over where it's got to, so the throw carries on from there.
    if (isSpinning.value) {
      tumble = spinPose
      isSpinning.value = false
      unschedule()
    }

    const gain = (decay * turnsPer1000 * Math.PI * 2) / 1000
    spinVelocity[0] -= dy * gain
    spinVelocity[1] -= dx * gain

    const speed = Math.hypot(...spinVelocity)
    const cap = maxSpeed * Math.PI * 2

    if (speed > cap) {
      spinVelocity.forEach((v, i) => spinVelocity[i] = (v / speed) * cap)
    }

    landing = undefined
    isTumbling.value = true
  }

  const tumbling = (delta: number, around: Mat3) => {
    let target = IDENTITY

    for (let left = delta / 1000; left > 0; left -= 1 / 120) {
      const dt = Math.min(left, 1 / 120)

      // Aims for the face it would have coasted to, so a flick never gets pulled back, but no more than a quarter turn
      // ahead, or the spring would take the short way round, backwards.
      const speed = Math.hypot(...spinVelocity)

      if (!landing && speed < landingSpeed) {
        const ahead = speed && Math.min(1 / decay, Math.PI / 2 / speed)
        landing = nearest(multiply(fromAxisAngle(spinVelocity.map(v => v * ahead) as Vec3), tumble), around).symmetry
        landingTime = 0
      }

      // Fades from friction into the spring over `response`, so the pull builds rather than kicking in.
      if (landing) {
        landingTime += dt
        const handover = smoothstep(Math.min(1, landingTime / (landResponse / 1000)))
        target = multiply(multiply(around, landing), transpose(around))
        const error = toAxisAngle(multiply(target, transpose(tumble)))
        spinVelocity.forEach((v, i) => spinVelocity[i] = v + (handover * (error[i]! * landStiffness - v * landDamping) - (1 - handover) * v * decay) * dt)
      }
      else {
        spinVelocity.forEach((v, i) => spinVelocity[i] = v * Math.exp(-decay * dt))
      }

      tumble = multiply(fromAxisAngle(spinVelocity.map(v => v * dt) as Vec3), tumble)
    }

    // Landed on a face, which looks the same as no extra turn at all.
    if (landing && angleBetween(target, tumble) < 1e-3 && Math.hypot(...spinVelocity) < 1e-2) {
      tumble = IDENTITY
      spinVelocity.fill(0)
      landing = undefined
      isTumbling.value = false
    }
  }

  // Shows the box tumbling on top of `around`, blending in the resting shape from `w` as it nears a face, and drags the
  // image the way it's spinning on top of `[x, y]`.
  const render = (around: Mat3, w: number, [x, y]: Point) => {
    if (isTumbling.value) {
      const near = nearest(tumble, around).angle / (Math.PI / 2)
      w = Math.max(w, smoothstep(Math.min(1, near / morph, Math.hypot(...spinVelocity) / landingSpeed)))

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

    const x = pastZone(current[0], centre[0], windowWidth.value)
    const y = pastZone(current[1], centre[1], windowHeight.value)
    const around = turn(x * turns[0] * Math.PI * 2, y * turns[1] * Math.PI * 2)

    if (isTumbling.value) {
      tumbling(delta, around)
    }

    render(around, smoothstep(Math.min(1, Math.hypot(x, y) / reach)), [current[0], current[1]])
  }

  // Without a cursor, spin a quarter or half turn every so often, mostly around and sometimes over. A cube looks the same
  // every quarter turn, so it lands back on the resting shape without ever reversing. It lifts a little mid-spin, and the
  // image drifts the way the box is turning.
  const tiltRad = (tilt * Math.PI) / 180
  const isSpinning = shallowRef(false)
  let spin = { axis: 0, turn: 0, duration: 0 }
  let spinPose = IDENTITY
  let elapsed = 0
  let delay = 0

  const { start: schedule, stop: unschedule } = useTimeoutFn(() => {
    const isHalf = Math.random() < 0.35
    spin = {
      axis: Math.random() < 0.7 ? 0 : 1,
      turn: (isHalf ? 0.5 : 0.25) * (Math.random() < 0.5 ? -1 : 1),
      duration: duration * (isHalf ? 1.4 : 1),
    }
    elapsed = 0
    isSpinning.value = true
  }, () => delay, { immediate: false })

  const spinning = (delta: number) => {
    elapsed += delta

    const t = Math.min(1, elapsed / spin.duration)
    const progress = easeSpin(t)
    const along = progress * spin.turn * Math.PI * 2
    const arc = Math.sin(Math.PI * progress)
    const lift = arc * tiltRad * Math.sign(spin.turn)
    const w = smoothstep(Math.min(1, progress / 0.2, (1 - progress) / 0.2))
    spinPose = spin.axis ? turn(lift, along) : turn(along, Math.abs(lift))
    setClip(blendClip(() => getBox()(spinPose), w))

    const sway = arc * 0.5 * Math.sign(spin.turn)
    setDrift(spin.axis ? 0 : sway, spin.axis ? sway : 0)

    if (t >= 1) {
      setClip(restClip)
      setDrift(0, 0)
      isSpinning.value = false
      delay = random(rest)
      schedule()
    }
  }

  // Start after a short random wait, so it doesn't look scripted. A spin cut short by scrolling away finishes first.
  watch(() => mode.value === 'autoplay' && isVisible.value && !isTumbling.value, (isPlaying) => {
    if (!isPlaying) {
      unschedule()
    }
    else if (!isSpinning.value) {
      delay = random([800, 2000])
      schedule()
    }
  })

  // Hidden tabs get no frames anyway, so only being offscreen needs checking. Otherwise frames only run while the spring
  // is settling or the box is spinning or tumbling.
  const canRun = computed(() => isVisible.value && (isTumbling.value || (mode.value === 'follow' ? !isSettled.value : isSpinning.value)))

  const { pause, resume } = useRafFn(({ delta }) => {
    // Cap the step so returning to a background tab doesn't cause a jump.
    const step = Math.min(delta, 50)

    if (mode.value === 'follow') {
      following(step)
    }
    else if (isTumbling.value) {
      tumbling(step, IDENTITY)
      render(IDENTITY, 0, [0, 0])
    }
    else {
      spinning(step)
    }
  }, { immediate: false })

  // Paused from here rather than inside the frame, where the loop has already queued its next one.
  watch(canRun, isRunning => isRunning ? resume() : pause())

  watch(mode, () => {
    isSpinning.value = false
    isTumbling.value = false
    tumble = IDENTITY
    spinVelocity.fill(0)
    landing = undefined
    current[0] = pointer[0] = velocity[0] = 0
    current[1] = pointer[1] = velocity[1] = 0
    isSettled.value = true
    setClip(restClip)
    setDrift(0, 0)
  })

  // Last cursor position, so scrolling the box under a still cursor counts too.
  let client: Point | undefined

  const follow = () => {
    if (mode.value !== 'follow' || !client || !target.value) {
      return
    }

    const rect = target.value.getBoundingClientRect()
    zone = rect.width / 2
    centre[0] = rect.left + zone
    centre[1] = rect.top + rect.height / 2

    const toEdge = (at: number, from: number, size: number) => (at - from) / Math.max(1, side(at - from, from, size))
    moveTo(toEdge(client[0], centre[0], windowWidth.value), toEdge(client[1], centre[1], windowHeight.value))
  }

  useEventListener('pointermove', (event: PointerEvent) => {
    client = [event.clientX, event.clientY]
    follow()
  }, { passive: true })

  // Wheels and trackpads, with a cursor, which also catch sideways swipes and swipes past the top of the page. Lines and
  // pages are roughly converted to pixels.
  // Not pinching to zoom, or scrolling an open dialog.
  useEventListener('wheel', (event: WheelEvent) => {
    if (mode.value === 'follow' && !event.ctrlKey && !(event.target as Element | null)?.closest?.('dialog')) {
      const unit = [1, 16, windowHeight.value][event.deltaMode] ?? 1
      throwBox(event.deltaX * unit, event.deltaY * unit)
    }
  }, { passive: true })

  useEventListener('scroll', follow, { passive: true })

  // Without one, how far a finger drags, whether or not the page scrolls with it. Dragging up moves things up, as
  // scrolling down does.
  let touch: Point | undefined

  useEventListener('touchstart', (event: TouchEvent) => {
    const finger = event.touches[0]
    touch = event.touches.length === 1 && finger && !(event.target as Element | null)?.closest?.('dialog') ? [finger.clientX, finger.clientY] : undefined
  }, { passive: true })

  useEventListener('touchmove', (event: TouchEvent) => {
    const finger = event.touches[0]

    if (mode.value === 'autoplay' && touch && finger) {
      throwBox(touch[0] - finger.clientX, touch[1] - finger.clientY, swipeSensitivity)
      touch = [finger.clientX, finger.clientY]
    }
  }, { passive: true })

  // Leaving the window, which is the only time there's nothing on the other side.
  useEventListener('pointerout', (event: PointerEvent) => {
    if (mode.value === 'follow' && !event.relatedTarget) {
      client = undefined
      moveTo(0, 0)
    }
  }, { passive: true })

  return restClip
}
