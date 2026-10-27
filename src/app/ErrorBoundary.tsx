import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { pick } from '../i18n/lang'

/**
 * Végső védőháló: ha egy képernyő renderelése váratlanul hibázik, a játékos nem üres (fekete) oldalt lát, hanem üzenetet és gombokat
 * (menübe vissza / újratöltés). A mentés nem vész el: a játék folyamatosan a helyi tárolóba ment.
 */
interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('NIGHTDOKU: váratlan hiba a felületen', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <main className="nd-page" role="alert" style={{ display: 'grid', placeItems: 'center', minHeight: '100%', textAlign: 'center' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--display)', letterSpacing: '0.08em' }}>{pick('Valami elromlott', 'Something went wrong')}</h2>
          <p style={{ color: 'var(--muted)', maxWidth: '40ch', margin: '0.6rem auto 1.2rem' }}>
            {pick(
              'Váratlan hiba történt a megjelenítésben. A játékállásod el van mentve — töltsd újra az oldalt.',
              'An unexpected error broke the display. Your progress is saved — reload the page.',
            )}
          </p>
          <button type="button" className="nd-btn" onClick={() => window.location.reload()}>
            {pick('Újratöltés', 'Reload')}
          </button>
        </div>
      </main>
    )
  }
}
