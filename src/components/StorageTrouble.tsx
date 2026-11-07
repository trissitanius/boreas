import { useEffect, useState } from 'react'
import { db } from '../db/db'
import { needsSafari14Workaround } from '../db/idb'
import { strings } from '../strings'

const t = strings.storageTrouble

type Result = { label: string; ok: boolean | null; detail?: string }

/** Resolves with the promise's value, or rejects after `ms` with "timed out". */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(t.timedOut(ms / 1000))), ms)),
  ])
}

function errorText(e: unknown): string {
  if (e instanceof Error) return `${e.name}: ${e.message}`
  return String(e)
}

/** Opens and removes a tiny throwaway database, straight through the browser (no Dexie). */
function rawOpenProbe(): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('boreas-probe', 1)
    req.onupgradeneeded = () => req.result.createObjectStore('probe')
    req.onsuccess = () => {
      req.result.close()
      indexedDB.deleteDatabase('boreas-probe')
      resolve()
    }
    req.onerror = () => reject(req.error)
    req.onblocked = () => reject(new Error('blocked'))
  })
}

/**
 * Shown when the app's data hasn't loaded after a few seconds. Runs quick checks so a screenshot
 * tells us exactly which step fails on this phone, and offers "Try again".
 */
export function StorageTrouble() {
  const [results, setResults] = useState<Result[]>([])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const out: Result[] = []
      const push = (r: Result) => {
        out.push(r)
        if (!cancelled) setResults([...out])
      }
      const hasIdb = typeof indexedDB !== 'undefined'
      push({ label: t.checkAvailable, ok: hasIdb })
      if (!hasIdb) return

      if (indexedDB.databases) {
        try {
          await withTimeout(indexedDB.databases(), 3000)
          push({ label: t.checkList, ok: true })
        } catch (e) {
          push({ label: t.checkList, ok: false, detail: errorText(e) })
        }
      }
      try {
        await withTimeout(rawOpenProbe(), 3000)
        push({ label: t.checkOpenTest, ok: true })
      } catch (e) {
        push({ label: t.checkOpenTest, ok: false, detail: errorText(e) })
      }
      try {
        await withTimeout(db.open(), 4000)
        push({ label: t.checkOpenBoreas, ok: true, detail: `${await db.exercises.count()} exercises` })
      } catch (e) {
        push({ label: t.checkOpenBoreas, ok: false, detail: errorText(e) })
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="storage-trouble">
      <h1 className="page-title day-editor-title">{t.title}</h1>
      <p>{t.intro}</p>
      <button type="button" className="btn btn-primary sheet-wide-button" onClick={() => location.reload()}>
        {t.tryAgain}
      </button>
      <h2 className="section-label">{t.checks}</h2>
      <ul className="trouble-checks">
        {results.map((r) => (
          <li key={r.label}>
            <span className={r.ok ? 'trouble-ok' : 'trouble-bad'}>{r.ok ? '✓' : '✗'}</span> {r.label}
            {r.detail && <span className="trouble-detail">{r.detail}</span>}
          </li>
        ))}
      </ul>
      <p className="trouble-detail">
        {t.mode(needsSafari14Workaround(navigator.userAgent))} · {navigator.userAgent}
      </p>
      <p className="muted">{t.screenshot}</p>
    </section>
  )
}
