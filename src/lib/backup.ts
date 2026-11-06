// Backup: all data in one JSON file, and restoring it (which replaces everything on this phone).
import type { BoreasDB } from '../db/db'
import { MUSCLES } from '../db/muscles'
import type { AppSettings, DayTemplate, Exercise, Machine, Session, SetLog } from '../db/types'
import { strings } from '../strings'

export const BACKUP_APP = 'boreas'
export const BACKUP_FORMAT = 1

export interface BackupData {
  machines: Machine[]
  exercises: Exercise[]
  dayTemplates: DayTemplate[]
  sessions: Session[]
  setLogs: SetLog[]
  settings: AppSettings[]
}

export interface Backup {
  app: typeof BACKUP_APP
  format: number
  exportedAt: number
  data: BackupData
}

export interface BackupSummary {
  exportedAt: number
  sessions: number
  sets: number
  exercises: number
  machines: number
  /** Date of the newest session ("YYYY-MM-DD"), if any. */
  newestSession?: string
}

const TABLES = ['machines', 'exercises', 'dayTemplates', 'sessions', 'setLogs', 'settings'] as const

/** Everything on this phone, ready to save as a file. */
export async function createBackup(db: BoreasDB, now: number = Date.now()): Promise<Backup> {
  const [machines, exercises, dayTemplates, sessions, setLogs, settings] = await Promise.all([
    db.machines.toArray(),
    db.exercises.toArray(),
    db.dayTemplates.toArray(),
    db.sessions.toArray(),
    db.setLogs.toArray(),
    db.settings.toArray(),
  ])
  return {
    app: BACKUP_APP,
    format: BACKUP_FORMAT,
    exportedAt: now,
    // Photos (Blobs) can't go into JSON; there are none yet.
    data: { machines: machines.map(({ photo: _photo, ...m }) => m), exercises, dayTemplates, sessions, setLogs, settings },
  }
}

/** "boreas-backup-2026-11-06.json" */
export function backupFileName(isoDate: string): string {
  return `boreas-backup-${isoDate}.json`
}

export function summarize(backup: Pick<Backup, 'exportedAt' | 'data'>): BackupSummary {
  const dates = backup.data.sessions.map((s) => s.date).sort()
  return {
    exportedAt: backup.exportedAt,
    sessions: backup.data.sessions.length,
    sets: backup.data.setLogs.length,
    exercises: backup.data.exercises.length,
    machines: backup.data.machines.length,
    newestSession: dates[dates.length - 1],
  }
}

// ---------- Checking a backup file ----------

type Check = (value: unknown) => boolean
const isString: Check = (v) => typeof v === 'string'
const isNumber: Check = (v) => typeof v === 'number' && Number.isFinite(v)
const isStringArray: Check = (v) => Array.isArray(v) && v.every(isString)
const optional = (check: Check): Check => (v) => v === undefined || check(v)
const oneOf = (...values: unknown[]): Check => (v) => values.includes(v)
const muscleList: Check = (v) => isStringArray(v) && (v as string[]).every((m) => (MUSCLES as readonly string[]).includes(m))
const isoDate: Check = (v) => isString(v) && /^\d{4}-\d{2}-\d{2}$/.test(v as string)
const intIn = (min: number, max: number): Check => (v) => Number.isInteger(v) && (v as number) >= min && (v as number) <= max

const stamps = { id: isString, createdAt: isNumber, updatedAt: isNumber }

const SHAPES: Record<(typeof TABLES)[number], Record<string, Check>> = {
  machines: { ...stamps, gymNumber: isString, brand: isString, model: isString },
  exercises: {
    ...stamps,
    name: isString,
    machineId: optional(isString),
    variant: optional(isString),
    settings: isString,
    primaryMuscles: muscleList,
    secondaryMuscles: muscleList,
    cues: isStringArray,
    startingWeightKg: optional(isNumber),
    weightIncrementKg: isNumber,
    loadType: oneOf('stack', 'dumbbell', 'plate', 'bodyweight'),
  },
  dayTemplates: { ...stamps, weekday: intIn(1, 7), name: isString, exerciseIds: isStringArray },
  sessions: { ...stamps, date: isoDate, dayTemplateId: isString },
  setLogs: {
    ...stamps,
    sessionId: isString,
    exerciseId: isString,
    setNumber: intIn(1, 3),
    weightKg: (v) => v === null || isNumber(v),
    reps: intIn(0, 999),
    loggedAt: isNumber,
  },
  settings: { ...stamps, id: oneOf('app'), unit: oneOf('kg', 'lb'), lastBackupAt: optional(isNumber) },
}

class BackupError extends Error {}

function damaged(detail: string): never {
  throw new BackupError(strings.backup.errors.damaged(detail))
}

/**
 * Reads and checks a backup file's text. Nothing is changed here.
 * Returns the backup and a summary, or a message saying why the file can't be used.
 */
export function parseBackup(
  text: string,
): { ok: true; backup: Backup; summary: BackupSummary } | { ok: false; error: string } {
  try {
    let raw: unknown
    try {
      raw = JSON.parse(text)
    } catch {
      throw new BackupError(strings.backup.errors.notJson)
    }
    const file = raw as Partial<Backup> | null
    if (!file || typeof file !== 'object' || file.app !== BACKUP_APP) throw new BackupError(strings.backup.errors.notBoreas)
    if (!isNumber(file.format) || file.format! > BACKUP_FORMAT) throw new BackupError(strings.backup.errors.newerFormat)
    if (!isNumber(file.exportedAt) || !file.data || typeof file.data !== 'object') damaged('missing data')

    const data = file.data as unknown as Record<string, unknown>
    for (const table of TABLES) {
      const rows = data[table]
      if (!Array.isArray(rows)) damaged(`missing ${table}`)
      const ids = new Set<string>()
      for (const row of rows as unknown[]) {
        if (!row || typeof row !== 'object') damaged(`bad record in ${table}`)
        for (const [field, check] of Object.entries(SHAPES[table])) {
          if (!check((row as Record<string, unknown>)[field])) damaged(`${table}: bad “${field}”`)
        }
        const id = (row as { id: string }).id
        if (ids.has(id)) damaged(`${table}: duplicate id`)
        ids.add(id)
      }
    }

    // Links between records must be intact.
    const d = file.data as BackupData
    const machineIds = new Set(d.machines.map((m) => m.id))
    const exerciseIds = new Set(d.exercises.map((e) => e.id))
    const dayIds = new Set(d.dayTemplates.map((t) => t.id))
    const sessionIds = new Set(d.sessions.map((s) => s.id))
    if (d.exercises.some((e) => e.machineId !== undefined && !machineIds.has(e.machineId))) damaged('unknown machine')
    if (d.dayTemplates.some((t) => t.exerciseIds.some((id) => !exerciseIds.has(id)))) damaged('unknown exercise on a day')
    if (d.sessions.some((s) => !dayIds.has(s.dayTemplateId))) damaged('unknown day')
    if (d.setLogs.some((l) => !sessionIds.has(l.sessionId))) damaged('set without session')
    if (d.setLogs.some((l) => !exerciseIds.has(l.exerciseId))) damaged('set with unknown exercise')
    const sessionKeys = new Set(d.sessions.map((s) => `${s.date}|${s.dayTemplateId}`))
    if (sessionKeys.size !== d.sessions.length) damaged('double session')

    const backup = file as Backup
    return { ok: true, backup, summary: summarize(backup) }
  } catch (e) {
    if (e instanceof BackupError) return { ok: false, error: e.message }
    throw e
  }
}

/** Replaces ALL data on this phone with the backup, in one transaction (all or nothing). */
export async function restoreBackup(db: BoreasDB, backup: Backup): Promise<void> {
  const tables = [db.machines, db.exercises, db.dayTemplates, db.sessions, db.setLogs, db.settings]
  await db.transaction('rw', tables, async () => {
    await Promise.all(tables.map((t) => t.clear()))
    await db.machines.bulkAdd(backup.data.machines)
    await db.exercises.bulkAdd(backup.data.exercises)
    await db.dayTemplates.bulkAdd(backup.data.dayTemplates)
    await db.sessions.bulkAdd(backup.data.sessions)
    await db.setLogs.bulkAdd(backup.data.setLogs)
    await db.settings.bulkAdd(backup.data.settings)
  })
}
