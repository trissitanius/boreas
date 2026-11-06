import { describe, expect, it } from 'vitest'
import { forceApp, installMode, isIOS, isStandalone } from './platform'

const UA = {
  androidChrome:
    'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
  iphoneSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
  iphoneChrome:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0.0.0 Mobile/15E148 Safari/604.1',
  // iPadOS pretends to be a Mac
  ipadAsMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
  macSafari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
  desktopFirefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0',
  androidFirefox: 'Mozilla/5.0 (Android 15; Mobile; rv:145.0) Gecko/145.0 Firefox/145.0',
}

describe('isIOS', () => {
  it('recognises iPhones and iPads, including iPads that say they are a Mac', () => {
    expect(isIOS(UA.iphoneSafari, 5)).toBe(true)
    expect(isIOS(UA.iphoneChrome, 5)).toBe(true)
    expect(isIOS(UA.ipadAsMac, 5)).toBe(true)
  })

  it('does not treat Macs or Android as iOS', () => {
    expect(isIOS(UA.macSafari, 0)).toBe(false)
    expect(isIOS(UA.androidChrome, 5)).toBe(false)
  })
})

describe('installMode', () => {
  it('Android Chrome with a prompt → real install prompt', () => {
    expect(installMode(UA.androidChrome, 5, true)).toBe('android-prompt')
  })

  it('iPhone and iPad → Share / Add to Home Screen guide', () => {
    expect(installMode(UA.iphoneSafari, 5, false)).toBe('ios-guide')
    expect(installMode(UA.iphoneChrome, 5, false)).toBe('ios-guide')
    expect(installMode(UA.ipadAsMac, 5, false)).toBe('ios-guide')
  })

  it('no prompt and not iOS → browser-menu guide', () => {
    expect(installMode(UA.desktopFirefox, 0, false)).toBe('manual-guide')
    expect(installMode(UA.androidFirefox, 5, false)).toBe('manual-guide')
    expect(installMode(UA.androidChrome, 5, false)).toBe('manual-guide')
  })
})

describe('isStandalone', () => {
  const fakeWindow = (displayStandalone: boolean, iosStandalone?: boolean) =>
    ({
      matchMedia: () => ({ matches: displayStandalone }),
      navigator: { standalone: iosStandalone },
    }) as unknown as Window

  it('is true when opened from the home screen', () => {
    expect(isStandalone(fakeWindow(true))).toBe(true)
    expect(isStandalone(fakeWindow(false, true))).toBe(true) // older iPhones
  })

  it('is false in a browser tab', () => {
    expect(isStandalone(fakeWindow(false))).toBe(false)
    expect(isStandalone(fakeWindow(false, false))).toBe(false)
  })
})

describe('forceApp', () => {
  it('opens the tracker with ?app', () => {
    expect(forceApp('?app')).toBe(true)
    expect(forceApp('?x=1&app')).toBe(true)
    expect(forceApp('')).toBe(false)
    expect(forceApp('?apple=1')).toBe(false)
  })
})
