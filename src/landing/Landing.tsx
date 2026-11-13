import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { installMode } from '../lib/platform'
import { promptInstall, useInstallState } from '../lib/installPrompt'
import { strings } from '../strings'
import { InstallGuide } from './InstallGuide'
import { hasWebGL } from '../lib/webgl'
import { LICENSE_URL, REPO_URL } from '../lib/links'
import { Wordmark } from '../components/Logo'

/** GitHub's mark, drawn in the text color. */
function GitHubMark() {
  return (
    <svg className="github-mark" viewBox="0 0 16 16" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  )
}

// The 3D objects are a separate download, fetched only after the page has appeared.
const Hero3D = lazy(() => import('./Hero3D'))

const t = strings.landing

/** The website's welcome page. The installed app never shows this. */
export function Landing() {
  const { canPrompt, installed } = useInstallState()
  const [guide, setGuide] = useState<'ios' | 'manual' | null>(null)
  const mode = installMode(navigator.userAgent, navigator.maxTouchPoints ?? 0, canPrompt)
  const closeGuide = useCallback(() => setGuide(null), [])
  const [art, setArt] = useState<'3d' | 'image' | null>(null)

  useEffect(() => {
    // Wait until the page has drawn, then load the 3D (or the still image without WebGL).
    const id = window.setTimeout(() => setArt(hasWebGL() ? '3d' : 'image'), 120)
    return () => window.clearTimeout(id)
  }, [])

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
        <Wordmark />
        <nav className="topbar-links">
          <a className="topbar-link" href={REPO_URL} target="_blank" rel="noopener">
            <GitHubMark />
            <span className="topbar-link-text">{t.sourceCode}</span>
          </a>
          <a className="topbar-link" href="?app">
            {t.tryInBrowser}
          </a>
        </nav>
      </header>

      <div className="landing-first">
        <div className="hero-art">
          {art === '3d' && (
            <Suspense fallback={null}>
              <Hero3D />
            </Suspense>
          )}
          {art === 'image' && (
            <img className="hero-fallback" src={`${import.meta.env.BASE_URL}hero-fallback.webp`} alt="" />
          )}
      </div>

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
      </div>

      <section className="landing-showcase" aria-labelledby="showcase-title">
        <h2 id="showcase-title" className="landing-features-title">
          {t.showcaseTitle}
        </h2>
        <ul className="screen-list">
          {t.screens.map((screen) => (
            <li key={screen.image} className="screen">
              <div className="phone">
                <img
                  src={`${import.meta.env.BASE_URL}${screen.image}`}
                  alt={screen.alt}
                  width="390"
                  height="844"
                  loading="lazy"
                />
              </div>
              <h3>{screen.title}</h3>
              <p>{screen.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="landing-features" aria-labelledby="features-title">
        <h2 id="features-title" className="landing-features-title">
          {t.featuresTitle}
        </h2>
        <ul className="feature-list">
          {t.features.map((f, i) => (
            <li key={f.title} className="feature">
              <span className="feature-number" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </li>
          ))}
        </ul>
        <a className="btn btn-large github-button" href={REPO_URL} target="_blank" rel="noopener">
          <GitHubMark />
          {t.viewOnGitHub}
        </a>
      </section>

      <section className="landing-cta">
        <img className="landing-cta-logo" src={`${import.meta.env.BASE_URL}logo-3d.webp`} alt="" width="192" height="192" loading="lazy" />
        <h2 className="landing-cta-title">{t.ctaTitle}</h2>
        <p className="landing-cta-text">{t.ctaText}</p>
        {installed ? (
          <p className="landing-installed">{t.installed}</p>
        ) : (
          <button type="button" className="btn btn-primary btn-large" onClick={() => void onInstall()}>
            {t.install}
          </button>
        )}
      </section>

      <footer className="landing-footer">
        <Wordmark />
        <p>
          {t.licenseLine}{' '}
          <a href={LICENSE_URL} target="_blank" rel="noopener">
            {t.license}
          </a>{' '}
          ·{' '}
          <a href={REPO_URL} target="_blank" rel="noopener">
            {t.sourceCode}
          </a>
        </p>
      </footer>

      {guide && <InstallGuide mode={guide} onClose={closeGuide} />}
    </div>
  )
}
