import Dexie, { type DexieOptions, type EntityTable } from 'dexie'
import type { AppSettings, DayTemplate, Exercise, Machine, Session, SetLog } from './types'
import { buildSeed } from './seed'
import { dexieOptions } from './idb'

export class BoreasDB extends Dexie {
  machines!: EntityTable<Machine, 'id'>
  exercises!: EntityTable<Exercise, 'id'>
  dayTemplates!: EntityTable<DayTemplate, 'id'>
  sessions!: EntityTable<Session, 'id'>
  setLogs!: EntityTable<SetLog, 'id'>
  settings!: EntityTable<AppSettings, 'id'>

  constructor(name = 'boreas', options?: DexieOptions) {
    super(name, options)

    // Only indexed fields are listed here; records can hold more.
    this.version(1).stores({
      machines: 'id, gymNumber',
      exercises: 'id, machineId',
      dayTemplates: 'id, weekday',
      // One session per date per day template ('&' = unique).
      sessions: 'id, &[date+dayTemplateId], date',
      // [exerciseId+loggedAt] finds an exercise's latest sets across ALL days.
      setLogs: 'id, sessionId, [exerciseId+loggedAt]',
      settings: 'id',
    })

    // Runs only when the database is created for the first time.
    this.on('populate', async (tx) => {
      const seed = buildSeed()
      await tx.table('machines').bulkAdd(seed.machines)
      await tx.table('exercises').bulkAdd(seed.exercises)
      await tx.table('dayTemplates').bulkAdd(seed.dayTemplates)
      await tx.table('settings').bulkAdd(seed.settings)
    })
  }
}

/** The app's one database. Tests create their own BoreasDB with a unique name instead. */
export const db = new BoreasDB('boreas', dexieOptions())
