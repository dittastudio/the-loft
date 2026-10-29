// The geometry behind useBoxTurn: rotations, the cube's outline in perspective, and blending convex shapes, all in cell
// units (0-1) with no Vue in sight.

export type Point = [number, number]
export type Vec3 = [number, number, number]
export type Mat3 = [number, number, number, number, number, number, number, number, number] // row by row

const CENTRE: Point = [0.5, 0.5]
const SAMPLES = 96

export const smoothstep = (t: number) => t * t * (3 - 2 * t)

// CSS's cubic-bezier() timing function, solved for `x` by bisection.
export const cubicBezier = (x1: number, y1: number, x2: number, y2: number) => {
  const at = (a: number, b: number, t: number) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3

  return (x: number) => {
    let lo = 0
    let hi = 1

    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2

      if (at(x1, x2, mid) < x) {
        lo = mid
      } else {
        hi = mid
      }
    }

    return at(y1, y2, (lo + hi) / 2)
  }
}

const CUBE: Vec3[] = [-0.5, 0.5].flatMap((x) => [-0.5, 0.5].flatMap((y) => [-0.5, 0.5].map((z) => [x, y, z] as Vec3)))

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

export const IDENTITY: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1]

// Written out, as it runs many times a frame.
export const multiply = (a: Mat3, b: Mat3): Mat3 => [
  a[0] * b[0] + a[1] * b[3] + a[2] * b[6],
  a[0] * b[1] + a[1] * b[4] + a[2] * b[7],
  a[0] * b[2] + a[1] * b[5] + a[2] * b[8],
  a[3] * b[0] + a[4] * b[3] + a[5] * b[6],
  a[3] * b[1] + a[4] * b[4] + a[5] * b[7],
  a[3] * b[2] + a[4] * b[5] + a[5] * b[8],
  a[6] * b[0] + a[7] * b[3] + a[8] * b[6],
  a[6] * b[1] + a[7] * b[4] + a[8] * b[7],
  a[6] * b[2] + a[7] * b[5] + a[8] * b[8],
]

// Its inverse, as it's a rotation.
export const transpose = (m: Mat3): Mat3 => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]]

// Turns |v| radians around `v`.
export const fromAxisAngle = ([x, y, z]: Vec3): Mat3 => {
  const angle = Math.hypot(x, y, z)

  if (angle < 1e-12) {
    return IDENTITY
  }

  const [ux, uy, uz] = [x / angle, y / angle, z / angle]
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  const t = 1 - c

  return [
    t * ux * ux + c,
    t * ux * uy - s * uz,
    t * ux * uz + s * uy,
    t * ux * uy + s * uz,
    t * uy * uy + c,
    t * uy * uz - s * ux,
    t * ux * uz - s * uy,
    t * uy * uz + s * ux,
    t * uz * uz + c,
  ]
}

// The other way, up to a half turn either way round.
export const toAxisAngle = (m: Mat3): Vec3 => {
  const angle = Math.acos(Math.min(1, Math.max(-1, (m[0] + m[4] + m[8] - 1) / 2)))
  const twist: Vec3 = [m[7] - m[5], m[2] - m[6], m[3] - m[1]]

  if (angle < 1e-9) {
    return [0, 0, 0]
  }

  // Near a half turn the twist all but vanishes, so the axis comes from the biggest column of `m` plus the identity
  // instead, which is twice the axis times its own length along it, turned whichever way the twist still leans.
  if (Math.PI - angle < 1e-3) {
    const j = [m[0], m[4], m[8]].indexOf(Math.max(m[0], m[4], m[8]))
    const axis = [0, 1, 2].map((i) => m[i * 3 + j]! + (i === j ? 1 : 0))
    const length = Math.hypot(...axis)
    const sign = axis.reduce((sum, v, i) => sum + v * twist[i]!, 0) < 0 ? -1 : 1

    return axis.map((v) => (v / length) * angle * sign) as Vec3
  }

  const k = angle / (2 * Math.sin(angle))

  return twist.map((v) => v * k) as Vec3
}

export const angleBetween = (a: Mat3, b: Mat3) => Math.hypot(...toAxisAngle(multiply(a, transpose(b))))

// Turns on its vertical axis then leans the top towards the camera on its horizontal one.
export const turn = (yaw: number, pitch: number) => multiply(fromAxisAngle([pitch, 0, 0]), fromAxisAngle([0, yaw, 0]))

// The 24 ways a cube can be turned and look the same: each axis onto another, either way round, without mirroring.
export const SYMMETRIES = [
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0],
]
  .flatMap((order) =>
    [1, -1].flatMap((a) =>
      [1, -1].flatMap((b) =>
        [1, -1].map((c) => {
          const m = [0, 0, 0, 0, 0, 0, 0, 0, 0] as Mat3
          ;[a, b, c].forEach((sign, row) => (m[row * 3 + order[row]!] = sign))

          return m
        }),
      ),
    ),
  )
  .filter(
    (m) =>
      m[0] * (m[4] * m[8] - m[5] * m[7]) - m[1] * (m[3] * m[8] - m[5] * m[6]) + m[2] * (m[3] * m[7] - m[4] * m[6]) > 0,
  )

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
export const blend = (from: Point[], to: Point[], w: number): Point[] => {
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
export const fitBox = (orientations: Mat3[], distance: number, scale: number) => {
  const faceOn = projectBox(IDENTITY, distance)
  const xs = faceOn.map((p) => p[0])
  const ys = faceOn.map((p) => p[1])
  const offsetX = (Math.max(...xs) + Math.min(...xs)) / 2
  const offsetY = (Math.max(...ys) + Math.min(...ys)) / 2
  const extent = (points: Point[]) =>
    Math.max(...points.flatMap(([x, y]) => [Math.abs(x - offsetX), Math.abs(y - offsetY)]))
  const maxExtent = Math.max(...orientations.map((rotation) => extent(projectBox(rotation, distance))))
  const fit = Math.min(
    1 / Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)),
    (0.49 * scale) / maxExtent,
  )

  return (rotation: Mat3) =>
    projectBox(rotation, distance).map(([x, y]): Point => [
      CENTRE[0] + (x - offsetX) * fit,
      CENTRE[1] + (y - offsetY) * fit,
    ])
}

export const range = (from: number, to: number, count: number) =>
  Array.from({ length: count + 1 }, (_, i) => from + ((to - from) * i) / count)
