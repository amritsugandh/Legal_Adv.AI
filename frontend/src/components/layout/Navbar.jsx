import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Scale, Upload, GitCompareArrows, LayoutDashboard, Sun, Moon } from 'lucide-react'
import { getSystemStatus } from '../../services/documents'
import { useTheme } from '../../context/ThemeContext'

export default function Navbar() {
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  const [systemStatus, setSystemStatus] = useState(null)

  useEffect(() => {
    getSystemStatus()
      .then(setSystemStatus)
      .catch(() => {})
  }, [location.pathname])

  const links = [
    { to: '/',        label: 'Dashboard', icon: LayoutDashboard },
    { to: '/upload',  label: 'Upload',    icon: Upload },
    { to: '/compare', label: 'Compare',   icon: GitCompareArrows },
  ]

  const isLight = theme === 'light'

  return (
    <header className="sticky top-0 z-50 navbar-solid">
      <div className="nav-shell">
        <div
          className="flex items-center justify-between gap-4"
          style={{ minHeight: '68px', paddingBlock: '0.65rem' }}
        >
          {/* ── Logo ── */}
          <Link to="/" className="flex items-center gap-3 group flex-shrink-0">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #6c5ce7, #00cec9)',
                border: '1px solid rgba(162, 155, 254, 0.3)',
                boxShadow: '0 0 16px rgba(108, 92, 231, 0.3)',
              }}
            >
              <Scale className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className="text-base font-extrabold tracking-tight"
                  style={{ color: 'var(--th-text-primary)' }}
                >
                  LegalLens
                </span>
                <span
                  className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider"
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
                className="text-[11px] font-medium leading-none mt-1 hidden sm:block"
                style={{ color: 'var(--th-text-muted)' }}
              >
                Legal Document Intelligence
              </p>
            </div>
          </Link>

          {/* ── Nav links + status + theme toggle ── */}
          <div className="flex items-center gap-2 min-w-0">
            {/* Nav pills */}
            <nav
              className="flex items-center gap-1 p-1 rounded-lg overflow-x-auto"
              style={{
                background: 'var(--th-nav-pill-bg)',
                border: '1px solid var(--th-border-subtle)',
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
                            background: 'linear-gradient(135deg, rgba(108,92,231,0.15), rgba(0,206,201,0.08))',
                            border: '1px solid rgba(108,92,231,0.25)',
                            color: isLight ? 'var(--color-aurora-violet)' : '#ffffff',
                            boxShadow: '0 0 12px rgba(108,92,231,0.12)',
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

            {/* Engine status */}
            <div
              className="hidden md:flex items-center gap-2 pl-3 text-xs font-mono"
              style={{
                borderLeft: '1px solid var(--th-border-subtle)',
                color: 'var(--th-text-muted)',
              }}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse"
                style={{
                  background: systemStatus?.llm?.configured
                    ? 'var(--color-aurora-green)'
                    : 'var(--color-gold)',
                  boxShadow: systemStatus?.llm?.configured
                    ? '0 0 8px rgba(85,239,196,0.5)'
                    : '0 0 8px rgba(253,203,110,0.5)',
                }}
              />
              <span className="text-[11px] whitespace-nowrap">
                {systemStatus?.llm?.configured ? 'Gemini 2.0' : 'Fallback'}
              </span>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="theme-toggle"
              title={isLight ? 'Switch to Dark theme' : 'Switch to Light theme'}
              aria-label={isLight ? 'Switch to Dark theme' : 'Switch to Light theme'}
            >
              {isLight ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
