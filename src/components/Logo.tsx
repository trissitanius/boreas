import { useId } from 'react'
import { strings } from '../strings'

/**
 * The Boreas mark, flat version: a weight plate (ring) with an Ember core, carried by three
 * streaks of north wind. Same drawing as public/favicon.svg; colors come from the theme.
 */
export function LogoMark({ size = 28 }: { size?: number }) {
  const windId = useId()
  return (
    <svg className="logo-mark" viewBox="16 96 480 320" width={(size * 480) / 320} height={size} aria-hidden="true">
      <defs>
        <linearGradient id={windId} gradientUnits="userSpaceOnUse" x1="30" y1="0" x2="190" y2="0">
          <stop offset="0" stopColor="var(--soft)" stopOpacity="0" />
          <stop offset="0.7" stopColor="var(--soft)" />
        </linearGradient>
      </defs>
      <g fill="none" stroke={`url(#${windId})`} strokeWidth="30" strokeLinecap="round">
        <path d="M84 180 H186" />
        <path d="M36 256 H164" />
        <path d="M108 332 H186" />
      </g>
      <circle cx="326" cy="256" r="134" fill="none" stroke="var(--soft)" strokeWidth="32" />
      <circle cx="326" cy="256" r="64" fill="none" stroke="var(--soft)" strokeOpacity="0.45" strokeWidth="12" />
      <circle cx="326" cy="256" r="30" fill="var(--accent)" />
    </svg>
  )
}

/** Mark + name, as used in the website's top bar and footer. */
export function Wordmark({ size }: { size?: number }) {
  return (
    <span className="wordmark">
      <LogoMark size={size} />
      {strings.appName}
    </span>
  )
}
