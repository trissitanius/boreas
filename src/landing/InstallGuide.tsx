import { useEffect, useRef } from 'react'
import { strings } from '../strings'

interface Props {
  mode: 'ios' | 'manual'
  onClose: () => void
}

const t = strings.installGuide

/** Simple drawn icons (our own, not Apple's artwork). */
function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" className="guide-icon">
      <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 11H6.5A1.5 1.5 0 0 0 5 12.5v7A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-7a1.5 1.5 0 0 0-1.5-1.5H16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function AddIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" className="guide-icon">
      <rect x="4" y="4" width="16" height="16" rx="3.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 8.5v7M8.5 12h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" className="guide-icon">
      <circle cx="12" cy="5" r="2" fill="currentColor" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      <circle cx="12" cy="19" r="2" fill="currentColor" />
    </svg>
  )
}

export function InstallGuide({ mode, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const ios = mode === 'ios'
  const steps = ios ? t.iosSteps : t.manualSteps
  const icons = ios ? [<ShareIcon />, <AddIcon />, null] : [<MenuIcon />, <AddIcon />, null]

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="guide-overlay" onClick={onClose}>
      <div
        className="guide-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="guide-title" className="guide-title">
          {ios ? t.iosTitle : t.manualTitle}
        </h2>
        <ol className="guide-steps">
          {steps.map((step, i) => (
            <li key={step}>
              <span className="guide-step-number">{i + 1}</span>
              <span className="guide-step-text">{step}</span>
              {icons[i]}
            </li>
          ))}
        </ol>
        <p className="guide-note">{ios ? t.iosNote : t.manualNote}</p>
        <button ref={closeRef} type="button" className="btn guide-close" onClick={onClose}>
          {t.close}
        </button>
      </div>
    </div>
  )
}
