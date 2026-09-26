import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Trash2, Upload, Clock, Layers,
  Search, ArrowRight, ShieldCheck, MessageSquare, GitCompare,
  FileCheck2
} from 'lucide-react'
import { listDocuments, deleteDocument } from '../services/documents'
import EmptyState from '../components/ui/EmptyState'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

const docTypeLabels = {
  employment_contract:   'Employment',
  rental_agreement:      'Rental / Lease',
  loan_agreement:        'Loan & Finance',
  nda:                   'Non-Disclosure',
  service_agreement:     'Master Service',
  partnership_agreement: 'Partnership',
  other:                 'General Agreement',
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function DashboardPage() {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [deleting, setDeleting]   = useState(null)

  useEffect(() => { fetchDocuments() }, [])

  async function fetchDocuments() {
    try {
      setLoading(true)
      setDocuments(await listDocuments())
    } catch (err) {
      toast.error(err.message || 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(e, id, filename) {
    e.preventDefault()
    e.stopPropagation()
    if (deleting) return
    if (!window.confirm(`Delete "${filename}"? This cannot be undone.`)) return
    setDeleting(id)
    try {
      await deleteDocument(id)
      setDocuments(prev => prev.filter(d => d.id !== id))
      toast.success('Document deleted')
    } catch (err) {
      toast.error(err.message || 'Failed to delete')
    } finally {
      setDeleting(null)
    }
  }

  const analyzedCount = documents.filter(d => d.status === 'ready').length
  const totalPages    = documents.reduce((s, d) => s + (Number(d.page_count) || 0), 0)
  const query         = search.trim().toLowerCase()
  const filtered      = documents.filter(d =>
    (d.filename || '').toLowerCase().includes(query) ||
    (d.document_type || '').toLowerCase().includes(query)
  )

  if (loading) return <LoadingSpinner text="Loading document repository..." />

  return (
    <div className="page-stack">

      {/* ── Page Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="page-header"
      >
        <div className="page-title-block">
          <div className="icon-box flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="page-kicker">Intelligence Workspace</p>
            <h1 className="page-title">Executive Dashboard</h1>
            <p className="page-description">
              Manage uploaded legal agreements, extract critical clauses, evaluate
              risk profiles, and cross-compare contracts.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 flex-wrap pt-1">
          <Link to="/upload" className="btn-primary">
            <Upload className="w-4 h-4" />
            Upload Document
          </Link>
          <Link to="/compare" className="btn-secondary">
            <GitCompare className="w-4 h-4" />
            Compare
          </Link>
        </div>
      </motion.div>

      {/* ── KPI Stats ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.3 }}
        className="stats-grid"
      >
        <div className="stat-card">
          <span className="stat-label">Indexed Documents</span>
          <div className="stat-value">{documents.length}</div>
        </div>
        <div className="stat-card stat-card-success">
          <span className="stat-label">AI Analyzed</span>
          <div className="stat-value">
            {analyzedCount}
            <FileCheck2 className="w-5 h-5 ml-1 opacity-80" style={{ color: 'var(--color-aurora-green)' }} />
          </div>
        </div>
        <div className="stat-card stat-card-gold">
          <span className="stat-label">Total Pages Indexed</span>
          <div className="stat-value">
            {totalPages}
            <span className="text-sm font-mono font-semibold" style={{ color: 'var(--th-text-muted)' }}>
              pgs
            </span>
          </div>
        </div>
      </motion.div>

      {/* ── Search Bar ── */}
      {documents.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.14 }}
          className="section-panel"
          style={{ padding: '1rem 1.25rem' }}
        >
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: 'var(--th-text-muted)' }}
              />
              <input
                type="text"
                placeholder="Search by title, agreement type, or keyword…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input pl-10"
                style={{ minHeight: '42px' }}
              />
            </div>
            <div
              className="flex items-center gap-3 text-xs whitespace-nowrap flex-shrink-0"
              style={{ color: 'var(--th-text-muted)' }}
            >
              <span>
                Showing{' '}
                <strong style={{ color: 'var(--th-text-primary)' }}>{filtered.length}</strong>
                {' '}of {documents.length}
              </span>
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="font-semibold hover:underline"
                  style={{ color: 'var(--color-aurora-purple)' }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Document Grid ── */}
      {filtered.length === 0 && documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No Legal Documents Yet"
          description="Upload a PDF or DOCX agreement to extract terms, surface hidden liabilities, and query clauses with AI."
        >
          <Link to="/upload" className="btn-primary">
            <Upload className="w-4 h-4" />
            Upload Your First Agreement
          </Link>
        </EmptyState>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching documents"
          description={`No results for "${search}". Try a different keyword.`}
        >
          <button onClick={() => setSearch('')} className="btn-secondary">
            Clear Search
          </button>
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          <AnimatePresence>
            {filtered.map((doc, idx) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ delay: idx * 0.05, duration: 0.25 }}
                className="card card-interactive flex flex-col"
                style={{ minHeight: '200px' }}
              >
                {/* Card header */}
                <div className="doc-card-header">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* File icon */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: 'var(--th-icon-box-bg)',
                        border: '1px solid var(--th-icon-box-bd)',
                        color: 'var(--color-aurora-purple)',
                      }}
                    >
                      <FileText className="w-4.5 h-4.5" style={{ width: '1.1rem', height: '1.1rem' }} />
                    </div>
                    {/* Title + type */}
                    <div className="min-w-0 flex-1">
                      <h3
                        className="font-bold text-sm leading-snug truncate"
                        style={{ color: 'var(--th-text-primary)' }}
                        title={doc.filename}
                      >
                        {doc.filename}
                      </h3>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="type-pill">{doc.file_type || 'PDF'}</span>
                        <span className="text-xs" style={{ color: 'var(--th-text-muted)' }}>
                          {docTypeLabels[doc.document_type] || 'Contract'}
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Delete */}
                  <button
                    onClick={e => handleDelete(e, doc.id, doc.filename)}
                    disabled={deleting === doc.id}
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
                    style={{ color: 'var(--th-text-muted)' }}
                    onMouseEnter={e => {
                      e.currentTarget.style.color = 'var(--color-danger)'
                      e.currentTarget.style.background = 'rgba(255,118,117,0.1)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.color = 'var(--th-text-muted)'
                      e.currentTarget.style.background = 'transparent'
                    }}
                    title={`Delete ${doc.filename}`}
                    aria-label={`Delete ${doc.filename}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Card body — metadata rows */}
                <div className="doc-card-body flex-1">
                  <div className="doc-card-row">
                    <span className="flex items-center gap-2 text-xs" style={{ color: 'var(--th-text-muted)' }}>
                      <Layers className="w-3.5 h-3.5" /> Pages
                    </span>
                    <span className="text-xs font-mono font-semibold" style={{ color: 'var(--th-text-primary)' }}>
                      {doc.page_count ?? '—'}
                    </span>
                  </div>
                  <div className="doc-card-row">
                    <span className="flex items-center gap-2 text-xs" style={{ color: 'var(--th-text-muted)' }}>
                      <Clock className="w-3.5 h-3.5" /> Uploaded
                    </span>
                    <span className="text-xs" style={{ color: 'var(--th-text-muted)' }}>
                      {formatDate(doc.uploaded_at)}
                    </span>
                  </div>
                  <div className="doc-card-row" style={{ borderBottom: 'none' }}>
                    <span className="text-xs" style={{ color: 'var(--th-text-muted)' }}>Status</span>
                    <span className={`badge ${doc.status === 'ready' ? 'badge-low' : 'badge-info'}`}>
                      {doc.status === 'ready' ? 'Analyzed' : doc.status || 'Processing'}
                    </span>
                  </div>
                </div>

                {/* Card footer — actions */}
                <div className="doc-card-footer">
                  <div className="flex items-center gap-0.5">
                    <Link
                      to={`/documents/${doc.id}?tab=chat`}
                      className="btn-ghost w-8 h-8 p-0 rounded-lg"
                      style={{ minHeight: 'unset', color: 'var(--th-text-muted)' }}
                      title="Open Q&A Chat"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </Link>
                    <Link
                      to="/compare"
                      className="btn-ghost w-8 h-8 p-0 rounded-lg"
                      style={{ minHeight: 'unset', color: 'var(--th-text-muted)' }}
                      title="Compare with another"
                    >
                      <GitCompare className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                  <Link
                    to={`/documents/${doc.id}`}
                    className="btn-primary text-xs"
                    style={{ minHeight: '34px', padding: '0 0.9rem', gap: '0.4rem' }}
                  >
                    Open Intelligence
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
