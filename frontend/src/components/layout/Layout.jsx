import { Outlet } from 'react-router-dom'
import { Scale } from 'lucide-react'
import Navbar from './Navbar'

export default function Layout() {
  return (
    <div className="app-shell">
      {/* Ambient aurora glow at the top */}
      <div className="aurora-glow-top" aria-hidden="true" />

      <Navbar />

      <main className="page-shell" style={{ position: 'relative', zIndex: 1 }}>
        <Outlet />
      </main>

      <footer className="site-footer no-print">
        <div className="nav-shell flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div
              className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, rgba(108,92,231,0.18), rgba(0,206,201,0.12))',
                border: '1px solid var(--th-border-default)',
              }}
            >
              <Scale className="w-3.5 h-3.5" style={{ color: 'var(--color-aurora-purple)' }} />
            </div>
            <div className="flex items-center gap-2" style={{ color: 'var(--th-text-muted)' }}>
              <span
                className="font-bold"
                style={{ color: 'var(--th-text-secondary)' }}
              >
                LegalLens AI
              </span>
              <span style={{ opacity: 0.35 }}>|</span>
              <span>Enterprise Legal Document Intelligence</span>
            </div>
          </div>

          {/* Disclaimer */}
          <p style={{ color: 'var(--th-text-muted)', opacity: 0.7 }}>
            Informational assistance only. Does not constitute formal legal counsel.
          </p>
        </div>
      </footer>
    </div>
  )
}
