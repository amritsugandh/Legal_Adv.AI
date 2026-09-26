import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Scale, Upload, GitCompareArrows, LayoutDashboard } from 'lucide-react'
import { getSystemStatus } from '../../services/documents'

export default function Navbar() {
  const location = useLocation()
  const [systemStatus, setSystemStatus] = useState(null)

  useEffect(() => {
    getSystemStatus()
      .then(setSystemStatus)
      .catch(() => {})
  }, [location.pathname])

  const links = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/upload', label: 'Upload', icon: Upload },
    { to: '/compare', label: 'Compare', icon: GitCompareArrows },
  ]

  return (
    <header className="sticky top-0 z-50 navbar-solid">
      <div className="nav-shell">
        <div className="flex items-center justify-between gap-4" style={{ minHeight: '68px', paddingBlock: '0.65rem' }}>
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3.5 group">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #6c5ce7, #00cec9)',
                border: '1px solid rgba(162, 155, 254, 0.3)',
                boxShadow: '0 0 16px rgba(108, 92, 231, 0.3)',
              }}
            >
              <Scale className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-base font-extrabold text-[var(--color-text-primary)] tracking-tight">
                  LegalLens
                </span>
                <span
                  className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider"
                  style={{
                    background: 'linear-gradient(135deg, rgba(108, 92, 231, 0.12), rgba(0, 206, 201, 0.08))',
                    border: '1px solid rgba(108, 92, 231, 0.2)',
                    color: 'var(--color-aurora-purple)',
                  }}
                >
                  AI v2.0
                </span>
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)] font-medium leading-none mt-1 hidden sm:block">
                Legal Document Intelligence & Analysis
              </p>
            </div>
          </Link>

          {/* Nav + Status */}
          <div className="flex items-center gap-3 min-w-0">
            <nav
              className="flex items-center gap-1 p-1 rounded-lg overflow-x-auto"
              style={{
                background: 'rgba(6, 6, 15, 0.6)',
                border: '1px solid rgba(100, 120, 200, 0.12)',
              }}
            >
              {links.map(({ to, label, icon: Icon }) => {
                const isActive = location.pathname === to
                return (
                  <Link
                    key={to}
                    to={to}
                    className="relative flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-bold transition-all"
                    style={
                      isActive
                        ? {
                            background: 'linear-gradient(135deg, rgba(108, 92, 231, 0.15), rgba(0, 206, 201, 0.08))',
                            border: '1px solid rgba(108, 92, 231, 0.25)',
                            color: '#ffffff',
                            boxShadow: '0 0 12px rgba(108, 92, 231, 0.12)',
                          }
                        : {
                            color: 'var(--color-text-muted)',
                            border: '1px solid transparent',
                          }
                    }
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{label}</span>
                  </Link>
                )
              })}
            </nav>

            {/* Engine Status */}
            <div
              className="hidden md:flex items-center gap-2 pl-3.5 text-xs font-mono"
              style={{
                borderLeft: '1px solid rgba(100, 120, 200, 0.12)',
                color: 'var(--color-text-muted)',
              }}
            >
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{
                  background: systemStatus?.llm?.configured ? 'var(--color-aurora-green)' : 'var(--color-gold)',
                  boxShadow: systemStatus?.llm?.configured ? '0 0 8px rgba(85, 239, 196, 0.5)' : '0 0 8px rgba(253, 203, 110, 0.5)',
                }}
              />
              <span className="text-[11px]">
                {systemStatus?.llm?.configured ? 'Gemini 2.0' : 'Fallback Heuristics'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
