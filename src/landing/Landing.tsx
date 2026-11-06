import { useCallback, useState } from 'react'
import { installMode } from '../lib/platform'
import { promptInstall, useInstallState } from '../lib/installPrompt'
import { strings } from '../strings'
import { InstallGuide } from './InstallGuide'

const t = strings.landing

/** The website's welcome page. The installed app never shows this. */
export function Landing() {
  const { canPrompt, installed } = useInstallState()
  const [guide, setGuide] = useState<'ios' | 'manual' | null>(null)
  const mode = installMode(navigator.userAgent, navigator.maxTouchPoints ?? 0, canPrompt)
  const closeGuide = useCallback(() => setGuide(null), [])

  async function onInstall() {
    if (mode === 'android-prompt') {
      const result = await promptInstall()
      if (result === 'unavailable') setGuide('manual')
      return
    }
    setGuide(mode === 'ios-guide' ? 'ios' : 'manual')
  }

  return (
    <div className="landing">
      <header className="topbar">
        <span className="wordmark">{strings.appName}</span>
        <a className="topbar-link" href="?app">
          {t.tryInBrowser}
        </a>
      </header>

      <main className="landing-hero">
        <p className="landing-eyebrow">{t.eyebrow}</p>
        <h1 className="landing-title">
          {t.titleLines.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </h1>
        {/* Room for the 3D weight plate, kettlebell and dumbbell (feature 9). */}
        <div className="hero-stage" aria-hidden="true" />
        <p className="landing-lead">{t.lead}</p>
        {installed ? (
          <p className="landing-installed">{t.installed}</p>
        ) : (
          <button type="button" className="btn btn-primary btn-large" onClick={() => void onInstall()}>
            {t.install}
          </button>
        )}
        <p className="landing-note">{t.note}</p>
      </main>

      {guide && <InstallGuide mode={guide} onClose={closeGuide} />}
    </div>
  )
}
