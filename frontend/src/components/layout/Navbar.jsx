import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Scale, Upload, GitCompareArrows, LayoutDashboard, Sun, Moon } from 'lucide-react'
import { getSystemStatus } from '../../services/documents'
import { useTheme } from '../../context/ThemeContext'

export default function Navbar() {
  const location          = useLocation()
  const { theme, toggleTheme } = useTheme()
  const [systemStatus, setSystemStatus] = useState(null)
  const isLight = theme === 'light'

  useEffect(() => {
    getSystemStatus().then(setSystemStatus).catch(() => {})
  }, [location.pathname])

  const links = [
    { to: '/',        label: 'Dashboard', icon: LayoutDashboard },
    { to: '/upload',  label: 'Upload',    icon: Upload           },
    { to: '/compare', label: 'Compare',   icon: GitCompareArrows },
  ]

  return (
    <header className="sticky top-0 z-50 navbar-solid">
      <div className="nav-shell">
        <div className="flex items-center justify-between gap-3" style={{ minHeight: '64px', paddingBlock: '0.6rem' }}>

          {/* ── Logo ── */}
          <Link to="/" className="flex items-center gap-3 flex-shrink-0 min-w-0">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #6c5ce7, #00cec9)',
                border: '1px solid rgba(162,155,254,0.35)',
                boxShadow: '0 0 16px rgba(108,92,231,0.3)',
              }}
            >
              <Scale className="w-4.5 h-4.5 text-white" style={{ width: '1.1rem', height: '1.1rem' }} />
            </div>
            <div className="hidden sm:block min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className="text-sm font-extrabold tracking-tight whitespace-nowrap"
                  style={{ color: 'var(--th-text-primary)' }}
                >
                  LegalLens
                </span>
                <span
                  className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider whitespace-nowrap"
                  style={{
                    background: 'linear-gradient(135deg, rgba(108,92,231,0.12), rgba(0,206,201,0.08))',
                    border: '1px solid rgba(108,92,231,0.2)',
                    color: 'var(--color-aurora-purple)',
                  }}
                >
                  AI v2.0
                </span>
              </div>
              <p
                className="text-[11px] font-medium leading-none mt-0.5 hidden lg:block whitespace-nowrap"
                style={{ color: 'var(--th-text-muted)' }}
              >
                Legal Document Intelligence
              </p>
            </div>
          </Link>

          {/* ── Nav + Status + Toggle ── */}
          <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">

            {/* Nav pills */}
            <nav
              className="flex items-center gap-0.5 p-1 rounded-xl overflow-x-auto"
              style={{
                background: 'var(--th-nav-pill-bg)',
                border: '1px solid var(--th-border-subtle)',
                scrollbarWidth: 'none',
                flexShrink: 1,
              }}
            >
              {links.map(({ to, label, icon: Icon }) => {
                const isActive = location.pathname === to
                return (
                  <Link
                    key={to}
                    to={to}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap"
                    style={
                      isActive
                        ? {
                            background: 'linear-gradient(135deg, rgba(108,92,231,0.18), rgba(0,206,201,0.1))',
                            border: '1px solid rgba(108,92,231,0.28)',
                            color: isLight ? 'var(--color-aurora-violet)' : '#ffffff',
                            boxShadow: '0 2px 10px rgba(108,92,231,0.15)',
                          }
                        : {
                            color: 'var(--th-text-muted)',
                            border: '1px solid transparent',
                          }
                    }
                  >
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="hidden sm:inline">{label}</span>
                  </Link>
                )
              })}
            </nav>

            {/* Engine status — hide on small screens */}
            <div
              className="hidden lg:flex items-center gap-2 pl-3 text-xs font-mono flex-shrink-0"
              style={{
                borderLeft: '1px solid var(--th-border-subtle)',
                color: 'var(--th-text-muted)',
              }}
            >
              <span
                className="w-2 h-2 rounded-full animate-pulse flex-shrink-0"
                style={{
                  background: systemStatus?.llm?.configured
                    ? 'var(--color-aurora-green)'
                    : 'var(--color-gold)',
                  boxShadow: systemStatus?.llm?.configured
                    ? '0 0 8px rgba(85,239,196,0.5)'
                    : '0 0 8px rgba(253,203,110,0.5)',
                }}
              />
              <span className="whitespace-nowrap">
                {systemStatus?.llm?.configured ? 'Gemini Live' : 'Fallback'}
              </span>
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="theme-toggle flex-shrink-0"
              title={isLight ? 'Switch to Dark' : 'Switch to Light'}
              aria-label={isLight ? 'Switch to Dark theme' : 'Switch to Light theme'}
            >
              {isLight
                ? <Moon className="w-4 h-4" />
                : <Sun  className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
