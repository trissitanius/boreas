// Works out whether we're the installed app or the website, and how this device installs apps.

/** How the "Install app" button should behave on this device. */
export type InstallMode = 'android-prompt' | 'ios-guide' | 'manual-guide'

/** iPhone, iPod or iPad. iPads since iPadOS 13 say they are a Mac, but real Macs have no touch screen. */
export function isIOS(userAgent: string, maxTouchPoints: number): boolean {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return true
  return /Macintosh/i.test(userAgent) && maxTouchPoints > 1
}

/**
 * - 'android-prompt': the browser gave us a real install prompt (Chrome on Android, also desktop Chrome/Edge).
 * - 'ios-guide': iPhone/iPad, where the only way is Share → Add to Home Screen.
 * - 'manual-guide': anything else (e.g. Firefox): explain the browser menu.
 */
export function installMode(userAgent: string, maxTouchPoints: number, hasPrompt: boolean): InstallMode {
  if (hasPrompt) return 'android-prompt'
  if (isIOS(userAgent, maxTouchPoints)) return 'ios-guide'
  return 'manual-guide'
}

/** True when opened from the home screen icon (not in a browser tab). */
export function isStandalone(win: Window = window): boolean {
  const displayStandalone = win.matchMedia?.('(display-mode: standalone)').matches ?? false
  const iosStandalone = (win.navigator as Navigator & { standalone?: boolean }).standalone === true
  return displayStandalone || iosStandalone
}

/** "?app" in the address opens the tracker in a normal browser tab (for testing, or using it without installing). */
export function forceApp(search: string): boolean {
  return new URLSearchParams(search).has('app')
}
