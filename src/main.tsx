import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/theme.css'
import './styles/ui.css'
import { Backdrop } from './components/Backdrop'
import { ErrorBoundary } from './components/ErrorBoundary'
import { forceApp, isStandalone } from './lib/platform'
import { listenForInstallPrompt } from './lib/installPrompt'
import { requestPersistentStorage } from './lib/storage'

// Opened from the home screen icon → the tracker. Opened in a browser → the welcome page.
// Each is loaded on its own, so the website never downloads the database code
// and the app never downloads the welcome page (or, later, its 3D models).
const showApp = isStandalone() || forceApp(location.search)

const App = lazy(() => import('./App').then((m) => ({ default: m.App })))
const Landing = lazy(() => import('./landing/Landing').then((m) => ({ default: m.Landing })))

if (showApp) {
  void requestPersistentStorage()
} else {
  listenForInstallPrompt()
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Backdrop />
    <ErrorBoundary>
      <Suspense fallback={null}>{showApp ? <App /> : <Landing />}</Suspense>
    </ErrorBoundary>
  </StrictMode>,
)
