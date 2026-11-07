import { describe, expect, it } from 'vitest'
import { storageClues } from './StorageTrouble'

const okStorage = { setItem() {}, removeItem() {} } as unknown as Storage
const blockedStorage = {
  setItem() {
    throw new Error('SecurityError')
  },
  removeItem() {},
} as unknown as Storage

describe('storageClues', () => {
  it('points to Lockdown Mode when WebAssembly is missing', () => {
    expect(storageClues({ navigator: { cookieEnabled: true }, localStorage: okStorage }).lockdownLikely).toBe(true)
    expect(storageClues({ WebAssembly: {}, navigator: { cookieEnabled: true }, localStorage: okStorage }).lockdownLikely).toBe(false)
  })

  it('points to blocked cookies', () => {
    expect(storageClues({ WebAssembly: {}, navigator: { cookieEnabled: false } }).cookiesBlocked).toBe(true)
  })

  it('checks whether simple storage works, without crashing when it is blocked', () => {
    expect(storageClues({ WebAssembly: {}, navigator: {}, localStorage: okStorage }).localStorageWorks).toBe(true)
    expect(storageClues({ WebAssembly: {}, navigator: {}, localStorage: blockedStorage }).localStorageWorks).toBe(false)
    expect(storageClues({ WebAssembly: {}, navigator: {} }).localStorageWorks).toBe(false)
  })
})
