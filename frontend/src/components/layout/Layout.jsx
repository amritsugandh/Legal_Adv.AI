import { Outlet } from 'react-router-dom'
import { Scale } from 'lucide-react'
import Navbar from './Navbar'

export default function Layout() {
  return (
    <div className="app-shell">
      <div className="aurora-glow-top" />

      <Navbar />

      <main className="page-shell" style={{ position: 'relative', zIndex: 1 }}>
        <Outlet />
      </main>

      <footer className="site-footer no-print">
        <div className="nav-shell flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--color-text-muted)]">
          <div className="flex items-center gap-3">
            <div
              className="w-6 h-6 rounded flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(108, 92, 231, 0.2), rgba(0, 206, 201, 0.15))',
                border: '1px solid rgba(108, 92, 231, 0.25)',
              }}
            >
              <Scale className="w-3.5 h-3.5 text-[var(--color-aurora-purple)]" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[var(--color-text-secondary)]">LegalLens AI</span>
              <span style={{ color: 'rgba(110, 120, 153, 0.4)' }}>|</span>
              <span>Enterprise Legal Document Intelligence</span>
            </div>
          </div>
          <p style={{ opacity: 0.7 }}>
            Informational assistance only. Does not constitute formal legal counsel.
          </p>
        </div>
      </footer>
    </div>
  )
}
