import { describe, expect, it } from 'vitest'
import { hasWebGL } from './webgl'

const fakeCanvas = (getContext: (kind: string) => unknown) => () => ({ getContext }) as unknown as HTMLCanvasElement

describe('hasWebGL', () => {
  it('is true when WebGL 2 or 1 is available', () => {
    expect(hasWebGL(fakeCanvas((k) => (k === 'webgl2' ? {} : null)))).toBe(true)
    expect(hasWebGL(fakeCanvas((k) => (k === 'webgl' ? {} : null)))).toBe(true)
  })

  it('is false without WebGL', () => {
    expect(hasWebGL(fakeCanvas(() => null))).toBe(false)
  })

  it('never crashes', () => {
    expect(
      hasWebGL(() => {
        throw new Error('no canvas')
      }),
    ).toBe(false)
    expect(
      hasWebGL(
        fakeCanvas(() => {
          throw new Error('blocked')
        }),
      ),
    ).toBe(false)
  })
})
