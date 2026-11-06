// Keeps Chrome's install prompt (Android) until the user taps "Install app".
// The event can fire before React has started, so main.tsx starts listening right away.
import { useSyncExternalStore } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export interface InstallState {
  /** The browser offered a real install prompt we can show. */
  canPrompt: boolean
  /** The app was just installed from this page. */
  installed: boolean
}

let deferred: BeforeInstallPromptEvent | null = null
let state: InstallState = { canPrompt: false, installed: false }
const listeners = new Set<() => void>()

function setState(next: InstallState) {
  state = next
  listeners.forEach((fn) => fn())
}

export function listenForInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault() // stop the browser's own mini-banner; our button shows it instead
    deferred = event as BeforeInstallPromptEvent
    setState({ ...state, canPrompt: true })
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    setState({ canPrompt: false, installed: true })
  })
}

/** Shows the real install prompt. 'unavailable' means there was none to show. */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferred) return 'unavailable'
  const event = deferred
  deferred = null // a prompt can only be used once
  await event.prompt()
  const { outcome } = await event.userChoice
  setState({ canPrompt: false, installed: outcome === 'accepted' || state.installed })
  return outcome
}

export function useInstallState(): InstallState {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange)
      return () => listeners.delete(onChange)
    },
    () => state,
  )
}
