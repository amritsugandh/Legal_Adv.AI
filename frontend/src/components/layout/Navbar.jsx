import { useState, useEffect, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Scale, Upload, GitCompareArrows, LayoutDashboard,
  Sun, Moon, Cpu, AlertTriangle, Menu, X,
} from 'lucide-react'
import { getSystemStatus } from '../../services/documents'
import { useTheme } from '../../context/ThemeContext'

const NAV_LINKS = [
  { to: '/',        label: 'Dashboard', icon: LayoutDashboard },
  { to: '/upload',  label: 'Upload',    icon: Upload           },
  { to: '/compare', label: 'Compare',   icon: GitCompareArrows },
]

export default function Navbar() {
  const location               = useLocation()
  const { theme, toggleTheme } = useTheme()
  const [systemStatus, setSystemStatus]   = useState(null)
  const [statusLoading, setStatusLoading] = useState(true)
  const [menuOpen, setMenuOpen]           = useState(false)
  const isLight = theme === 'light'

  // close mobile menu on route change
  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  const fetchStatus = useCallback(async () => {
    try   { setSystemStatus(await getSystemStatus()) }
    catch { setSystemStatus(null) }
    finally { setStatusLoading(false) }
  }, [])

  useEffect(() => {
    fetchStatus()
    const id = setInterval(fetchStatus, 30000)
    return () => clearInterval(id)
  }, [fetchStatus])

  const isConfigured = systemStatus?.llm?.configured === true

  const engineLabel = statusLoading          ? 'Connecting…'
                    : isConfigured           ? 'Gemini 2.0 Flash'
                    : systemStatus === null  ? 'Backend offline'
                    : 'AI Ready'

  const dotColor = statusLoading         ? 'var(--th-text-muted)'
                 : isConfigured          ? 'var(--color-aurora-green)'
                 : systemStatus === null ? 'var(--color-danger)'
                 : 'var(--color-gold)'

  const dotGlow = statusLoading         ? 'none'
                : isConfigured          ? '0 0 8px rgba(85,239,196,0.6)'
                : systemStatus === null ? '0 0 8px rgba(255,118,117,0.5)'
                : '0 0 8px rgba(253,203,110,0.5)'

  const StatusIcon = isConfigured ? Cpu : AlertTriangle

  return (
    <header className="sticky top-0 z-50 navbar-solid">
      <div className="nav-shell">

        {/* ── Main row ── */}
        <div className="navbar-inner">

          {/* Logo */}
          <Link to="/" className="navbar-logo">
            <div className="navbar-logo-icon">
              <Scale style={{ width: '1.1rem', height: '1.1rem', color: '#fff' }} />
            </div>
            <div className="navbar-logo-text">
              <div className="navbar-logo-row">
                <span className="navbar-logo-name">LegalLens</span>
                <span className="navbar-logo-badge">AI v2.0</span>
              </div>
              <p className="navbar-logo-sub">Legal Document Intelligence</p>
            </div>
          </Link>

          {/* ── Desktop right: nav + status + theme ── */}
          <div className="navbar-right">

            {/* Nav pills — hidden on mobile, shown md+ */}
            <nav className="navbar-nav" aria-label="Primary navigation">
              {NAV_LINKS.map(({ to, label, icon: Icon }) => {
                const active = location.pathname === to
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`navbar-nav-link${active ? ' navbar-nav-link--active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon className="navbar-nav-icon" />
                    <span className="navbar-nav-label">{label}</span>
                  </Link>
                )
              })}
            </nav>

            {/* Status pill — md+ */}
            <div className="navbar-status" aria-live="polite">
              <span
                className="navbar-status-dot"
                style={{ background: dotColor, boxShadow: dotGlow }}
              />
              <StatusIcon
                style={{
                  width: '0.75rem', height: '0.75rem', flexShrink: 0,
                  color: isConfigured ? 'var(--color-aurora-green)' : 'var(--color-gold)',
                  opacity: 0.85,
                }}
              />
              <span className="navbar-status-label">{engineLabel}</span>
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="theme-toggle"
              title={isLight ? 'Switch to Dark' : 'Switch to Light'}
              aria-label={isLight ? 'Switch to Dark theme' : 'Switch to Light theme'}
            >
              {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            {/* Hamburger — only visible below md */}
            <button
              className="navbar-hamburger"
              onClick={() => setMenuOpen(v => !v)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              {menuOpen
                ? <X   style={{ width: '1.1rem', height: '1.1rem' }} />
                : <Menu style={{ width: '1.1rem', height: '1.1rem' }} />}
            </button>
          </div>
        </div>

        {/* ── Mobile dropdown menu ── */}
        {menuOpen && (
          <nav
            className="navbar-mobile-menu"
            aria-label="Mobile navigation"
          >
            {NAV_LINKS.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to
              return (
                <Link
                  key={to}
                  to={to}
                  className={`navbar-mobile-link${active ? ' navbar-mobile-link--active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon style={{ width: '1rem', height: '1rem', flexShrink: 0 }} />
                  {label}
                </Link>
              )
            })}

            {/* Status row inside mobile menu */}
            <div className="navbar-mobile-status">
              <span
                className="navbar-status-dot"
                style={{ background: dotColor, boxShadow: dotGlow }}
              />
              <span className="navbar-status-label">{engineLabel}</span>
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}
