import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { BoreasDB } from '../db/db'
import { createMachine, getLastResult, logSet, updateExercise } from '../db/repo'
import { createTestDb } from '../test/testDb'
import { backupFileName, createBackup, parseBackup, restoreBackup, summarize, type Backup } from './backup'
import { progression } from './progression'

const WED = '2026-11-04'
const FRI = '2026-11-06'

let db: BoreasDB
beforeEach(async () => {
  db = await createTestDb()
})
afterEach(async () => {
  await db.delete()
})

async function logCurls() {
  for (const [i, reps] of [12, 11, 10].entries()) {
    await logSet(db, { exerciseId: 'ex-dumbbell-curl', dayTemplateId: 'day-wed', date: WED, setNumber: i + 1, weightKg: 14, reps })
  }
}

async function snapshot(d: BoreasDB) {
  const sortById = <T extends { id: string }>(rows: T[]) => [...rows].sort((a, b) => a.id.localeCompare(b.id))
  return {
    machines: sortById(await d.machines.toArray()),
    exercises: sortById(await d.exercises.toArray()),
    dayTemplates: sortById(await d.dayTemplates.toArray()),
    sessions: sortById(await d.sessions.toArray()),
    setLogs: sortById(await d.setLogs.toArray()),
    settings: sortById(await d.settings.toArray()),
  }
}

/** A valid backup as text, changed by `edit` to test what gets refused. */
async function backupText(edit?: (b: Backup) => void) {
  await logCurls()
  const backup = JSON.parse(JSON.stringify(await createBackup(db))) as Backup
  edit?.(backup)
  return JSON.stringify(backup)
}

describe('backup round trip', () => {
  it('backup → wipe → restore gives back exactly the same data and answers', async () => {
    await logCurls()
    await updateExercise(db, 'ex-dumbbell-curl', { settings: 'back pad 6, seat 3', weightIncrementKg: 2 })
    await createMachine(db, { gymNumber: 'N9', brand: 'Nautilus', model: 'Leg Extension' })
    const before = await snapshot(db)
    const curl = (await db.exercises.get('ex-dumbbell-curl'))!
    const flagBefore = progression(await getLastResult(db, curl.id, { before: FRI }), curl)

    const text = JSON.stringify(await createBackup(db))
    await Promise.all([db.machines, db.exercises, db.dayTemplates, db.sessions, db.setLogs, db.settings].map((t) => t.clear()))
    expect(await db.setLogs.count()).toBe(0)

    const parsed = parseBackup(text)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    await restoreBackup(db, parsed.backup)

    expect(await snapshot(db)).toEqual(before)
    const curlAfter = (await db.exercises.get('ex-dumbbell-curl'))!
    expect(progression(await getLastResult(db, curlAfter.id, { before: FRI }), curlAfter)).toEqual(flagBefore)
    expect(flagBefore).toEqual({ kind: 'increase', fromKg: 14, suggestedKg: 16 })
  })

  it('restore replaces: data that is not in the backup is gone', async () => {
    const parsed = parseBackup(JSON.stringify(await createBackup(db))) // seed only, no sessions
    await logCurls()
    expect(await db.setLogs.count()).toBe(3)
    if (!parsed.ok) throw new Error(parsed.error)
    await restoreBackup(db, parsed.backup)
    expect(await db.setLogs.count()).toBe(0)
    expect(await db.sessions.count()).toBe(0)
    expect(await db.exercises.count()).toBe(18)
  })

  it('a failed restore changes nothing', async () => {
    await logCurls()
    const before = await snapshot(db)
    const parsed = parseBackup(JSON.stringify(await createBackup(db)))
    if (!parsed.ok) throw new Error(parsed.error)
    // Sneak in a broken record that the database refuses (two sessions on the same date and day).
    const s = parsed.backup.data.sessions[0]
    parsed.backup.data.sessions.push({ ...s, id: 'other-id' })
    await expect(restoreBackup(db, parsed.backup)).rejects.toThrow()
    expect(await snapshot(db)).toEqual(before)
  })
})

describe('parseBackup refuses files it cannot use', () => {
  const refused = async (text: string, contains: string) => {
    const result = parseBackup(text)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain(contains)
  }

  it('not JSON / another app / newer format', async () => {
    await refused('this is not json', 'can’t be read')
    await refused(JSON.stringify({ app: 'other', format: 1 }), 'isn’t a Boreas backup')
    await refused(await backupText((b) => (b.format = 2)), 'newer version')
  })

  it('missing tables or bad records', async () => {
    await refused(await backupText((b) => delete (b.data as Partial<Backup['data']>).setLogs), 'missing setLogs')
    await refused(await backupText((b) => delete (b.data.setLogs[0] as Partial<Backup['data']['setLogs'][0]>).reps), 'reps')
    await refused(await backupText((b) => (b.data.setLogs[0].setNumber = 4)), 'setNumber')
    await refused(await backupText((b) => (b.data.exercises[0].primaryMuscles = ['wings' as never])), 'primaryMuscles')
  })

  it('broken links between records', async () => {
    await refused(await backupText((b) => (b.data.setLogs[0].sessionId = 'nope')), 'set without session')
    await refused(await backupText((b) => b.data.dayTemplates[0].exerciseIds.push('ex-nope')), 'unknown exercise')
    await refused(await backupText((b) => (b.data.exercises[0].machineId = 'm-nope')), 'unknown machine')
  })

  it('refused files leave the phone unchanged', async () => {
    const text = await backupText((b) => (b.data.setLogs[0].sessionId = 'nope'))
    const before = await snapshot(db)
    parseBackup(text)
    expect(await snapshot(db)).toEqual(before)
  })
})

describe('summary and file name', () => {
  it('counts what is in the backup', async () => {
    await logCurls()
    const backup = await createBackup(db, 1_700_000_000_000)
    expect(summarize(backup)).toEqual({
      exportedAt: 1_700_000_000_000,
      sessions: 1,
      sets: 3,
      exercises: 18,
      machines: 12,
      newestSession: WED,
    })
  })

  it('names the file by date', () => {
    expect(backupFileName('2026-11-06')).toBe('boreas-backup-2026-11-06.json')
  })
})
