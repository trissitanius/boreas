// The three gym objects, built from triangles in code (no downloaded models).
// Units are metres, at real size. Every part says which material it uses; scene.ts makes the meshes.
import {
  BufferGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  ExtrudeGeometry,
  LatheGeometry,
  Path,
  Shape,
  SplineCurve,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three'

export type MaterialKey = 'black' | 'rubber' | 'plateFace' | 'chrome' | 'iron' | 'knurl'

export interface Part {
  name: string
  geometry: BufferGeometry
  material: MaterialKey
}

/** Points around a rounded rectangle in (r, y) space, for lathe profiles. Closed (first = last). */
function roundedRectProfile(
  r0: number,
  r1: number,
  halfY: number,
  innerRadius: number,
  outerRadius: number,
  steps = 10,
): Vector2[] {
  const pts: Vector2[] = []
  const corner = (cx: number, cy: number, radius: number, from: number) => {
    for (let i = 0; i <= steps; i++) {
      const a = from + (i / steps) * (Math.PI / 2)
      pts.push(new Vector2(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius))
    }
  }
  // Counter-clockwise in (r, y): inner-bottom → outer-bottom → outer-top → inner-top
  corner(r0 + innerRadius, -halfY + innerRadius, innerRadius, Math.PI)
  corner(r1 - outerRadius, -halfY + outerRadius, outerRadius, (3 * Math.PI) / 2)
  corner(r1 - outerRadius, halfY - outerRadius, outerRadius, 0)
  corner(r0 + innerRadius, halfY - innerRadius, innerRadius, Math.PI / 2)
  pts.push(pts[0].clone())
  return pts
}

/** Spins an (r, y) profile around the Y axis, then lays it so the axis points along Z (toward the viewer). */
function lathe(points: Vector2[], segments: number): BufferGeometry {
  const g = new LatheGeometry(points, segments)
  g.rotateX(Math.PI / 2)
  return g
}

/** A stadium-shaped slot (rounded both ends), centred on a circle at `angle`, running along the circle. */
function gripSlot(centerRadius: number, angle: number, length: number, width: number, steps = 20): Path {
  const n = new Vector2(Math.cos(angle), Math.sin(angle)) // outward
  const t = new Vector2(-Math.sin(angle), Math.cos(angle)) // along the circle
  const c = n.clone().multiplyScalar(centerRadius)
  const e1 = c.clone().addScaledVector(t, length / 2)
  const e2 = c.clone().addScaledVector(t, -length / 2)
  const r = width / 2
  const pts: Vector2[] = []
  const tAngle = Math.atan2(t.y, t.x)
  // Half circle around e1 (from -n through +t to +n), then around e2 (from +n through -t to -n).
  for (let i = 0; i <= steps; i++) {
    const a = tAngle - Math.PI / 2 + (i / steps) * Math.PI
    pts.push(new Vector2(e1.x + Math.cos(a) * r, e1.y + Math.sin(a) * r))
  }
  for (let i = 0; i <= steps; i++) {
    const a = tAngle + Math.PI / 2 + (i / steps) * Math.PI
    pts.push(new Vector2(e2.x + Math.cos(a) * r, e2.y + Math.sin(a) * r))
  }
  return new Path(pts)
}

// ---------- Weight plate (Olympic, 20 kg, 450 mm) ----------

export const PLATE = {
  outerRadius: 0.225,
  rimInner: 0.186,
  rimHalfThickness: 0.027,
  faceRadius: 0.192,
  faceDepth: 0.024,
  holeRadius: 0.025, // 50 mm bar
  hubRadius: 0.096,
  slotCenterRadius: 0.139,
  slotLength: 0.072,
  slotWidth: 0.036,
  /** Grip slots sit at the top and at 120° steps. */
  slotAngles: [Math.PI / 2, Math.PI / 2 + (2 * Math.PI) / 3, Math.PI / 2 + (4 * Math.PI) / 3],
}

export function plateParts(): Part[] {
  const p = PLATE
  // Thick outer rim, rounded so the light rolls over the edge.
  const rim = lathe(roundedRectProfile(p.rimInner, p.outerRadius, p.rimHalfThickness, 0.004, 0.011, 12), 220)

  // The thinner face (web) between hub and rim, with three real cut-out grip slots.
  const face = new Shape()
  face.absarc(0, 0, p.faceRadius, 0, Math.PI * 2, false)
  const hubHole = new Path()
  hubHole.absarc(0, 0, p.hubRadius - 0.004, 0, Math.PI * 2, true)
  face.holes.push(hubHole)
  for (const a of p.slotAngles) face.holes.push(gripSlot(p.slotCenterRadius, a, p.slotLength, p.slotWidth))
  const faceGeo = new ExtrudeGeometry(face, {
    depth: p.faceDepth - 0.006,
    bevelEnabled: true,
    bevelThickness: 0.003,
    bevelSize: 0.003,
    bevelSegments: 4,
    curveSegments: 120,
  })
  faceGeo.translate(0, 0, -(p.faceDepth - 0.006) / 2)

  // Raised, stepped hub around the bar hole.
  const hubProfile = [
    new Vector2(0.0305, -0.031),
    new Vector2(0.052, -0.031),
    new Vector2(0.056, -0.029),
    new Vector2(0.06, -0.022),
    new Vector2(0.078, -0.02),
    new Vector2(0.082, -0.018),
    new Vector2(p.hubRadius, -0.016),
    new Vector2(p.hubRadius + 0.002, -0.013),
    new Vector2(p.hubRadius + 0.002, 0.013),
    new Vector2(p.hubRadius, 0.016),
    new Vector2(0.082, 0.018),
    new Vector2(0.078, 0.02),
    new Vector2(0.06, 0.022),
    new Vector2(0.056, 0.029),
    new Vector2(0.052, 0.031),
    new Vector2(0.0305, 0.031),
    new Vector2(0.0305, -0.031),
  ]
  const hub = lathe(hubProfile, 160)

  // Chrome sleeve inside the bar hole.
  const sleeve = lathe(roundedRectProfile(p.holeRadius, 0.0312, 0.033, 0.0015, 0.0025, 6), 96)

  return [
    { name: 'plate-rim', geometry: rim, material: 'black' },
    { name: 'plate-face', geometry: faceGeo, material: 'plateFace' },
    { name: 'plate-hub', geometry: hub, material: 'black' },
    { name: 'plate-sleeve', geometry: sleeve, material: 'chrome' },
  ]
}

// ---------- Kettlebell (cast iron, ~16 kg, 280 mm tall) ----------

export const KETTLEBELL = { height: 0.292, bellRadius: 0.106 }

export function kettlebellParts(): Part[] {
  // Bell: flat base, round belly, soft shoulder (spun profile through smooth points).
  const curve = new SplineCurve([
    new Vector2(0.058, 0),
    new Vector2(0.07, 0.005),
    new Vector2(0.084, 0.02),
    new Vector2(0.098, 0.045),
    new Vector2(0.105, 0.075),
    new Vector2(0.106, 0.098),
    new Vector2(0.101, 0.127),
    new Vector2(0.088, 0.157),
    new Vector2(0.068, 0.181),
    new Vector2(0.042, 0.197),
    new Vector2(0.016, 0.204),
    new Vector2(0, 0.205),
  ])
  const profile = [new Vector2(0, 0), ...curve.getPoints(90)]
  const bell = new LatheGeometry(profile, 160)
  bell.translate(0, -0.12, 0)

  // Handle: a thick tube along a smooth arch, its ends sunk into the shoulders.
  const path = new CatmullRomCurve3([
    new Vector3(-0.068, 0.148, 0),
    new Vector3(-0.084, 0.188, 0),
    new Vector3(-0.087, 0.226, 0),
    new Vector3(-0.077, 0.258, 0),
    new Vector3(-0.048, 0.283, 0),
    new Vector3(0, 0.292, 0),
    new Vector3(0.048, 0.283, 0),
    new Vector3(0.077, 0.258, 0),
    new Vector3(0.087, 0.226, 0),
    new Vector3(0.084, 0.188, 0),
    new Vector3(0.068, 0.148, 0),
  ])
  const handle = new TubeGeometry(path, 200, 0.0205, 40, false)
  handle.translate(0, -0.12, 0)

  // "Horns": where the handle meets the bell it thickens, like a real cast kettlebell.
  const horns: Part[] = [-1, 1].map((side) => {
    const horn = new CylinderGeometry(0.019, 0.03, 0.05, 48, 1, false)
    horn.rotateZ(side * 0.32)
    horn.translate(side * 0.071, 0.166 - 0.12, 0)
    return { name: `kettlebell-horn-${side < 0 ? 'left' : 'right'}`, geometry: horn, material: 'iron' as const }
  })

  return [
    { name: 'kettlebell-bell', geometry: bell, material: 'iron' },
    { name: 'kettlebell-handle', geometry: handle, material: 'iron' },
    ...horns,
  ]
}

// ---------- Dumbbell (hex heads, chrome knurled handle, ~350 mm) ----------

export const DUMBBELL = { handleRadius: 0.0165, handleLength: 0.14, headRadius: 0.07, headDepth: 0.082 }

export function dumbbellParts(): Part[] {
  const d = DUMBBELL
  // Knurled chrome handle along the X axis.
  const handle = new CylinderGeometry(d.handleRadius, d.handleRadius, d.handleLength, 64, 1, true)
  handle.rotateZ(Math.PI / 2)

  // Rounded chrome collars between handle and heads.
  const collarProfile = roundedRectProfile(d.handleRadius - 0.001, 0.027, 0.01, 0.002, 0.004, 8)
  const collars: Part[] = [-1, 1].map((side) => {
    const g = new LatheGeometry(collarProfile, 96)
    g.rotateZ(Math.PI / 2)
    g.translate(side * (d.handleLength / 2 + 0.009), 0, 0)
    return { name: `dumbbell-collar-${side < 0 ? 'left' : 'right'}`, geometry: g, material: 'chrome' as const }
  })

  // Hexagonal heads with chamfered (bevelled) edges, flat side down.
  const hex = new Shape()
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + (i * Math.PI) / 3
    const x = Math.cos(a) * d.headRadius
    const y = Math.sin(a) * d.headRadius
    if (i === 0) hex.moveTo(x, y)
    else hex.lineTo(x, y)
  }
  hex.closePath()
  const bevel = 0.008
  const heads: Part[] = [-1, 1].map((side) => {
    const g = new ExtrudeGeometry(hex, {
      depth: d.headDepth - 2 * bevel,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel * 0.8,
      bevelSegments: 5,
    })
    g.translate(0, 0, -(d.headDepth - 2 * bevel) / 2)
    g.rotateY(Math.PI / 2)
    g.translate(side * (d.handleLength / 2 + 0.019 + d.headDepth / 2), 0, 0)
    return { name: `dumbbell-head-${side < 0 ? 'left' : 'right'}`, geometry: g, material: 'rubber' as const }
  })

  return [{ name: 'dumbbell-handle', geometry: handle, material: 'knurl' }, ...collars, ...heads]
}

/** Total triangles in a list of parts (for the quality/performance check). */
export function triangleCount(parts: Part[]): number {
  return parts.reduce((sum, { geometry }) => {
    const index = geometry.getIndex()
    return sum + (index ? index.count : geometry.getAttribute('position').count) / 3
  }, 0)
}
