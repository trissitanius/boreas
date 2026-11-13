// Saves the 3D Boreas mark as the app icons in public/.
//
//   1. npm run dev -- --port 5199
//   2. node tools/render-icons.mjs            (uses Chrome; set CHROME=<path> if it's elsewhere)
//
// Needs Node 22+ (built-in WebSocket). Only run this when the logo changes.
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const URL = process.env.ICON_URL ?? 'http://localhost:5199/boreas/tools/render-icons.html'
const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9340

const FILES = [
  ['public/icons/icon-512.png', { size: 512 }],
  ['public/icons/icon-192.png', { size: 192 }],
  ['public/icons/apple-touch-icon.png', { size: 180 }],
  ['public/icons/icon-maskable-512.png', { size: 512, maskable: true }],
  ['public/logo-3d.webp', { size: 384, transparent: true, webp: true }],
]

const profile = mkdtempSync(join(tmpdir(), 'boreas-icons-'))
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
  const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true })).result?.value

  await send('Page.navigate', { url: URL })
  for (let i = 0; i < 40 && (await evaluate('typeof window.renderIcon')) !== 'function'; i++) await sleep(250)

  for (const [file, options] of FILES) {
    const dataUrl = await evaluate(`window.renderIcon(${JSON.stringify(options)})`)
    if (typeof dataUrl !== 'string') throw new Error(`Rendering ${file} failed. Is the dev server running at ${URL}?`)
    writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'))
    console.log('wrote', file)
  }
  ws.close()
} finally {
  chrome.kill()
  await sleep(300)
  rmSync(profile, { recursive: true, force: true })
}
