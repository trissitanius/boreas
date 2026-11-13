// Takes the app screenshots shown on the welcome page (public/screens/*.webp).
//
//   1. npm run dev -- --port 5199
//   2. node tools/render-screens.mjs          (uses Chrome; set CHROME=<path> if it's elsewhere)
//
// It opens the app in a fresh, empty browser profile, logs a pretend session one week ago
// (so "Last time" and "Increase weight" show), and photographs two screens at phone size.
// Needs Node 22+ (built-in WebSocket). Run it again whenever the app's look changes.
import { spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const BASE = process.env.APP_URL ?? 'http://localhost:5199/boreas/'
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9341
const PHONE = { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }

const profile = mkdtempSync(join(tmpdir(), 'boreas-screens-'))
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'])
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

try {
  let tabs
  for (let i = 0; i < 40 && !tabs; i++) {
    await sleep(250)
    tabs = await fetch(`http://127.0.0.1:${PORT}/json`).then((r) => r.json()).catch(() => undefined)
  }
  if (!tabs) throw new Error('Could not start Chrome. Set CHROME to its path.')
  const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl)
  await new Promise((r) => (ws.onopen = r))
  let id = 0
  const pending = new Map()
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data)
    if (m.id && pending.has(m.id)) pending.get(m.id)(m.result ?? m.error)
  }
  const send = (method, params = {}) =>
    new Promise((r) => {
      pending.set(++id, r)
      ws.send(JSON.stringify({ id, method, params }))
    })
  const js = async (expression) =>
    (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.value
  const click = (selector) => js(`(() => { const b = document.querySelector(${JSON.stringify(selector)}); b?.click(); return !!b })()`)
  const shot = async (name) => {
    await sleep(700)
    const r = await send('Page.captureScreenshot', { format: 'webp', quality: 82 })
    writeFileSync(`public/screens/${name}.webp`, Buffer.from(r.data, 'base64'))
    console.log('wrote', `public/screens/${name}.webp`)
  }

  mkdirSync('public/screens', { recursive: true })
  await send('Emulation.setDeviceMetricsOverride', PHONE)
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  await send('Page.navigate', { url: `${BASE}?app` })
  await sleep(4000)

  // Today's workout, with a session of the same exercises one week earlier.
  const seeded = await js(`(async () => {
    const { db } = await import('${new URL(BASE).pathname}src/db/db.ts')
    const repo = await import('${new URL(BASE).pathname}src/db/repo.ts')
    const dates = await import('${new URL(BASE).pathname}src/lib/dates.ts')
    const today = dates.toISODate()
    const templates = await db.dayTemplates.toArray()
    const day = templates.find((t) => t.weekday === dates.weekdayOf())
    if (!day || day.exerciseIds.length === 0) return 'rest day: run this on a workout day'
    const date = dates.addDays(today, -7)
    const weights = [42.5, 30, 35, 8, 27.5, 20, 25]
    let i = 0
    for (const exerciseId of day.exerciseIds) {
      const ex = await db.exercises.get(exerciseId)
      const reps = i % 3 === 0 ? [13, 12, 10] : i % 3 === 1 ? [11, 9, 8] : [12, 10, 9]
      for (let n = 1; n <= 3; n++) {
        const weightKg = ex.loadType === 'bodyweight' ? null : weights[i % weights.length]
        await repo.logSet(db, { exerciseId, dayTemplateId: day.id, date, setNumber: n, weightKg, reps: reps[n - 1] })
      }
      i++
    }
    // Pretend a backup was just saved, so the "back up" reminder stays out of the picture.
    await db.settings.update('app', { lastBackupAt: Date.now() })
    return day.name
  })()`)
  console.log('seeded:', seeded)
  await sleep(600)
  await shot('today')

  await click('.next-up')
  await sleep(1000)
  await click('.btn-save-set')
  await sleep(1000)
  await js(`[...document.querySelectorAll('.rest-timer .btn')].at(-1)?.click()`) // Skip the rest, so Save stays in view
  await js('window.scrollTo(0, 0)')
  await shot('logger')
  ws.close()
} finally {
  chrome.kill()
  await sleep(300)
  rmSync(profile, { recursive: true, force: true })
}
