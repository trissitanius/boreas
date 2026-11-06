import { describe, expect, it } from 'vitest'
import { Box3, Mesh, MeshBasicMaterial, DoubleSide, Raycaster, Vector3 } from 'three'
import { dumbbellParts, kettlebellParts, plateParts, PLATE, triangleCount, type Part } from './models'

function size(parts: Part[]) {
  const box = new Box3()
  for (const { geometry } of parts) {
    geometry.computeBoundingBox()
    box.union(geometry.boundingBox!)
  }
  return box.getSize(new Vector3())
}

function hasBadNumbers(parts: Part[]) {
  return parts.some(({ geometry }) => {
    const pos = geometry.getAttribute('position').array as ArrayLike<number>
    for (let i = 0; i < pos.length; i++) if (!Number.isFinite(pos[i])) return true
    return false
  })
}

const models = { plate: plateParts(), kettlebell: kettlebellParts(), dumbbell: dumbbellParts() }

describe('3D models', () => {
  it.each(Object.entries(models))('%s builds cleanly with a detailed mesh', (_, parts) => {
    expect(parts.length).toBeGreaterThan(0)
    expect(hasBadNumbers(parts)).toBe(false)
    const tris = triangleCount(parts)
    expect(tris).toBeGreaterThan(5_000) // detailed enough to look like a real product model
    expect(tris).toBeLessThan(150_000) // still light enough for phones
  })

  it('all three together stay within the phone budget', () => {
    const total = Object.values(models).reduce((sum, parts) => sum + triangleCount(parts), 0)
    expect(total).toBeLessThan(250_000)
  })

  it('has real-world sizes', () => {
    const plate = size(models.plate)
    expect(plate.x).toBeCloseTo(0.45, 2) // 450 mm Olympic plate
    expect(plate.y).toBeCloseTo(0.45, 2)
    expect(plate.z).toBeGreaterThan(0.05)
    expect(plate.z).toBeLessThan(0.08)

    const kettlebell = size(models.kettlebell)
    expect(kettlebell.y).toBeGreaterThan(0.27)
    expect(kettlebell.y).toBeLessThan(0.33)

    const dumbbell = size(models.dumbbell)
    expect(dumbbell.x).toBeGreaterThan(0.32)
    expect(dumbbell.x).toBeLessThan(0.38)
  })

  it('the plate has a real bar hole and three real grip holes', () => {
    const meshes = models.plate.map((p) => new Mesh(p.geometry, new MeshBasicMaterial({ side: DoubleSide })))
    meshes.forEach((m) => m.updateMatrixWorld())
    const hitsAt = (x: number, y: number) => {
      const ray = new Raycaster(new Vector3(x, y, 1), new Vector3(0, 0, -1))
      return ray.intersectObjects(meshes).length
    }
    // Straight through the middle: nothing in the way.
    expect(hitsAt(0, 0)).toBe(0)
    // Through the centre of each grip slot: nothing in the way.
    for (const a of PLATE.slotAngles) {
      expect(hitsAt(Math.cos(a) * PLATE.slotCenterRadius, Math.sin(a) * PLATE.slotCenterRadius)).toBe(0)
    }
    // Between the slots there is solid plate.
    const between = PLATE.slotAngles[0] + Math.PI / 3
    expect(hitsAt(Math.cos(between) * PLATE.slotCenterRadius, Math.sin(between) * PLATE.slotCenterRadius)).toBeGreaterThan(0)
    // And the rim is solid.
    expect(hitsAt(0.205, 0)).toBeGreaterThan(0)
  })

  it('uses only the known materials', () => {
    const allowed = new Set(['black', 'rubber', 'plateFace', 'chrome', 'iron', 'knurl'])
    for (const parts of Object.values(models)) for (const p of parts) expect(allowed).toContain(p.material)
  })
})
