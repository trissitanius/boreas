/** Asks the browser to keep this app's data even when the phone is low on space. */
export async function requestPersistentStorage(): Promise<void> {
  try {
    if (!navigator.storage?.persist) return
    if (await navigator.storage.persisted()) return
    await navigator.storage.persist()
  } catch {
    // Not supported or refused: the app still works, the data is just less protected.
  }
}

/** Whether the browser promised to keep this app's data (undefined if it can't tell). */
export async function isStoragePersisted(): Promise<boolean | undefined> {
  try {
    return navigator.storage?.persisted ? await navigator.storage.persisted() : undefined
  } catch {
    return undefined
  }
}
