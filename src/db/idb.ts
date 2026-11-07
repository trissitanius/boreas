// Opening IndexedDB reliably on iPhones.
//
// Safari 14 (2021) had a bug where IndexedDB could stall until `indexedDB.databases()` was called,
// so Dexie waits for that call before opening the database. On some newer iPhones that call never
// answers, and the app then hangs on "Loading…". Dexie only does this wait when it uses the browser's
// own `indexedDB` object, so everywhere except Safari 14 we hand it a thin wrapper around the very same
// database instead. Nothing else changes: same database, same data.

/** True only on iOS 14 / Safari 14, which still needs Dexie's wait. */
export function needsSafari14Workaround(userAgent: string): boolean {
  const ios14 = /(iPhone|iPad|iPod).* OS 14_\d/.test(userAgent)
  const macSafari14 = /Version\/14\.\d/.test(userAgent) && /Safari\//.test(userAgent) && !/Chrom(e|ium)\//.test(userAgent)
  return ios14 || macSafari14
}

/** The same IndexedDB, wrapped so Dexie skips the Safari 14 wait. */
export function wrapIndexedDB(idb: IDBFactory): IDBFactory {
  return {
    open: idb.open.bind(idb),
    deleteDatabase: idb.deleteDatabase.bind(idb),
    cmp: idb.cmp.bind(idb),
    databases: idb.databases?.bind(idb),
  } as IDBFactory
}

/** Options for the app's database: the wrapper on every browser except Safari 14. */
export function dexieOptions(): { indexedDB: IDBFactory; IDBKeyRange: typeof IDBKeyRange } | undefined {
  if (typeof indexedDB === 'undefined' || typeof navigator === 'undefined') return undefined
  if (needsSafari14Workaround(navigator.userAgent)) return undefined
  return { indexedDB: wrapIndexedDB(indexedDB), IDBKeyRange }
}
