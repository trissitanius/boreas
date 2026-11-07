import { afterEach, describe, expect, it } from 'vitest'
import { BoreasDB } from './db'
import { getLastResult, logSet } from './repo'
import { needsSafari14Workaround, wrapIndexedDB } from './idb'

const UA = {
  iphone14: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
  iphone17: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1',
  iphone18: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
  // Installed home-screen web apps on iPhone drop the "Version/… Safari/…" part.
  iphoneWebApp: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  macSafari14: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Safari/605.1.15',
  androidChrome: 'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
}

describe('needsSafari14Workaround', () => {
  it('keeps the old wait only on Safari 14', () => {
    expect(needsSafari14Workaround(UA.iphone14)).toBe(true)
    expect(needsSafari14Workaround(UA.macSafari14)).toBe(true)
  })

  it('skips it on newer iPhones (including installed web apps) and on Android', () => {
    expect(needsSafari14Workaround(UA.iphone17)).toBe(false)
    expect(needsSafari14Workaround(UA.iphone18)).toBe(false)
    expect(needsSafari14Workaround(UA.iphoneWebApp)).toBe(false)
    expect(needsSafari14Workaround(UA.androidChrome)).toBe(false)
  })
})

describe('the database works through the wrapper', () => {
  let db: BoreasDB
  afterEach(async () => {
    await db.delete()
  })

  it('opens, seeds, logs and reads back exactly as before', async () => {
    db = new BoreasDB(`boreas-wrapped-${Math.random()}`, { indexedDB: wrapIndexedDB(indexedDB), IDBKeyRange })
    await db.open()
    expect(await db.exercises.count()).toBe(18)
    for (const [i, reps] of [12, 11, 10].entries()) {
      await logSet(db, { exerciseId: 'ex-chest-press', dayTemplateId: 'day-sat', date: '2026-11-07', setNumber: i + 1, weightKg: 45, reps })
    }
    const last = await getLastResult(db, 'ex-chest-press', { before: '2026-11-10' })
    expect(last?.dayName).toBe('Half pull, half push')
    expect(last?.sets.map((s) => s.reps)).toEqual([12, 11, 10])
  })
})
