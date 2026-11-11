import { describe, expect, it } from 'vitest'
import { layout } from './Hero3D'

// Canvas sizes in world units (the canvas's aspect is what matters):
// laptop, big monitor, ultrawide, tablet landscape, square, phones.
const sizes = [
  [16, 10],
  [16, 9],
  [21, 9],
  [4, 3],
  [1, 1],
  [390, 593],
  [360, 520],
  [430, 700],
]

describe('hero layout', () => {
  it.each(sizes)('keeps every object fully on a %s:%s canvas', (w, h) => {
    for (const [name, pose] of Object.entries(layout(w, h))) {
      const reach = pose.size / 2
      expect(Math.abs(pose.x) + reach, `${name} x`).toBeLessThanOrEqual(w / 2)
      expect(Math.abs(pose.y) + reach, `${name} y`).toBeLessThanOrEqual(h / 2)
    }
  })
})
