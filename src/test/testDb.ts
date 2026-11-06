import { BoreasDB } from '../db/db'

/** A fresh, seeded database with a unique name, so tests never share data. */
export async function createTestDb(): Promise<BoreasDB> {
  const db = new BoreasDB(`boreas-test-${Math.random().toString(36).slice(2)}`)
  await db.open()
  return db
}
