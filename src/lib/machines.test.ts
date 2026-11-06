import { describe, expect, it } from 'vitest'
import { brandForGymNumber } from './machines'

describe('brandForGymNumber', () => {
  it('guesses the brand from the gym number', () => {
    expect(brandForGymNumber('16')).toBe('gym80')
    expect(brandForGymNumber(' 3 ')).toBe('gym80')
    expect(brandForGymNumber('N11')).toBe('Nautilus')
    expect(brandForGymNumber('n6')).toBe('Nautilus')
  })

  it('leaves other labels empty to fill in', () => {
    expect(brandForGymNumber('T6')).toBe('')
    expect(brandForGymNumber('Bench')).toBe('')
    expect(brandForGymNumber('')).toBe('')
  })
})
