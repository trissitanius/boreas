import { Component, type ReactNode } from 'react'
import { strings } from '../strings'

interface State {
  error: Error | null
}

/** If a screen crashes, show what went wrong (and a way to retry) instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    const t = strings.crash
    return (
      <main className="app storage-trouble">
        <h1 className="page-title day-editor-title">{t.title}</h1>
        <p>{t.intro}</p>
        <button type="button" className="btn btn-primary sheet-wide-button" onClick={() => location.reload()}>
          {strings.storageTrouble.tryAgain}
        </button>
        <p className="trouble-detail">
          {this.state.error.name}: {this.state.error.message} · {navigator.userAgent}
        </p>
        <p className="muted">{strings.storageTrouble.screenshot}</p>
      </main>
    )
  }
}
