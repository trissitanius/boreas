import { lazy, Suspense } from 'react'
import type { BodyMapProps } from './BodyMap'

const BodyMap = lazy(() => import('./BodyMap'))

/** The body map, downloaded only when a screen first shows it. Keeps its space while loading. */
export function LazyBodyMap(props: BodyMapProps) {
  return (
    <Suspense fallback={<div className="body-maps is-loading" aria-hidden="true" />}>
      <BodyMap {...props} />
    </Suspense>
  )
}
