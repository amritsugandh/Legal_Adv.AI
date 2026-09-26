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
  employment_contract:  'Employment',
  rental_agreement:     'Rental / Lease',
  loan_agreement:       'Loan & Finance',
  nda:                  'Non-Disclosure (NDA)',
  service_agreement:    'Master Service',
  partnership_agreement:'Partnership',
  other:                'General Agreement',
}

function formatDate(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', {
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

  async function handleDelete(id, filename) {
    if (deleting) return
    if (!window.confirm(`Delete "${filename}"? This cannot be undone.`)) return
    setDeleting(id)
    try {
      await deleteDocument(id)
      setDocuments((prev) => prev.filter((d) => d.id !== id))
      toast.success('Document deleted')
    } catch (err) {
      toast.error(err.message || 'Failed to delete')
    } finally {
      setDeleting(null)
    }
  }

  const analyzedCount = documents.filter((d) => d.status === 'ready').length
  const totalPages    = documents.reduce((s, d) => s + (Number(d.page_count) || 0), 0)
  const query         = search.trim().toLowerCase()
  const filtered      = documents.filter((d) =>
    (d.filename || '').toLowerCase().includes(query) ||
    (d.document_type || '').toLowerCase().includes(query)
  )

  if (loading) return <LoadingSpinner text="Loading documents repository..." />

  return (
    <div className="page-stack">

      {/* ── Page Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="page-header"
      >
        <div className="page-title-block">
          <div className="icon-box">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="page-kicker">Intelligence Workspace</p>
            <h1 className="page-title">Executive Dashboard</h1>
            <p className="page-description">
              Manage uploaded legal agreements, extract critical clauses, evaluate risk profiles,
              and cross-compare contracts.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
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
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Indexed Documents</span>
          <span className="stat-value">{documents.length}</span>
        </div>
        <div className="stat-card stat-card-success">
          <span className="stat-label">AI Analyzed</span>
          <span className="stat-value">
            {analyzedCount}
            <FileCheck2
              className="w-5 h-5 ml-1"
              style={{ color: 'var(--color-aurora-green)' }}
            />
          </span>
        </div>
        <div className="stat-card stat-card-gold">
          <span className="stat-label">Total Pages</span>
          <span className="stat-value">
            {totalPages}
            <span
              className="text-sm font-mono font-medium"
              style={{ color: 'var(--th-text-muted)' }}
            >
              PGS
            </span>
          </span>
        </div>
      </div>

      {/* ── Search & Filter Strip ── */}
      {documents.length > 0 && (
        <div className="section-panel py-3.5 px-5 flex flex-col sm:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: 'var(--th-text-muted)' }}
            />
            <input
              type="text"
              placeholder="Filter by title, agreement type, or keywords..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10 h-10"
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
                className="font-bold hover:underline"
                style={{ color: 'var(--color-aurora-purple)' }}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Document Grid / Empty States ── */}
      {filtered.length === 0 && documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No Legal Documents Uploaded"
          description="Upload an agreement (PDF or DOCX) to extract terms, surface hidden liabilities, and query clauses with AI."
        >
          <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
            <Link to="/upload" className="btn-primary">
              <Upload className="w-4 h-4" />
              Upload Agreement
            </Link>
          </div>
        </EmptyState>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching agreements found"
          description={`No documents match "${search}".`}
        >
          <button onClick={() => setSearch('')} className="btn-secondary mt-4">
            Reset Filter
          </button>
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          <AnimatePresence>
            {filtered.map((doc, idx) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ delay: idx * 0.04 }}
                className="card card-interactive flex flex-col"
              >
                {/* Card top strip */}
                <div
                  className="p-4 flex items-start justify-between gap-3"
                  style={{
                    borderBottom: '1px solid var(--th-border-subtle)',
                    background: 'var(--th-overlay-mild)',
                    borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{
                        background: 'var(--th-icon-box-bg)',
                        border: '1px solid var(--th-icon-box-bd)',
                        color: 'var(--color-aurora-purple)',
                      }}
                    >
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3
                        className="font-bold text-sm truncate"
                        style={{ color: 'var(--th-text-primary)' }}
                        title={doc.filename}
                      >
                        {doc.filename}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded"
                          style={{
                            background: 'rgba(108,92,231,0.1)',
                            border: '1px solid rgba(108,92,231,0.15)',
                            color: 'var(--color-aurora-purple)',
                          }}
                        >
                          {doc.file_type || 'PDF'}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--th-text-muted)' }}>
                          {docTypeLabels[doc.document_type] || doc.document_type || 'Contract'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => { e.preventDefault(); handleDelete(doc.id, doc.filename) }}
                    disabled={deleting === doc.id}
                    className="p-2 rounded-lg transition-colors flex-shrink-0"
                    style={{ color: 'var(--th-text-muted)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--color-danger)'
                      e.currentTarget.style.background = 'rgba(255,118,117,0.08)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--th-text-muted)'
                      e.currentTarget.style.background = 'transparent'
                    }}
                    title={`Delete ${doc.filename}`}
                    aria-label={`Delete ${doc.filename}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Card body */}
                <div
                  className="p-4 space-y-3 text-xs flex-1"
                  style={{ color: 'var(--th-text-secondary)' }}
                >
                  <div
                    className="flex items-center justify-between py-1.5"
                    style={{ borderBottom: '1px solid var(--th-border-subtle)' }}
                  >
                    <span
                      className="flex items-center gap-2"
                      style={{ color: 'var(--th-text-muted)' }}
                    >
                      <Layers className="w-3.5 h-3.5" /> Length
                    </span>
                    <span
                      className="font-mono font-semibold"
                      style={{ color: 'var(--th-text-primary)' }}
                    >
                      {doc.page_count} page{doc.page_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div
                    className="flex items-center justify-between py-1.5"
                    style={{ borderBottom: '1px solid var(--th-border-subtle)' }}
                  >
                    <span
                      className="flex items-center gap-2"
                      style={{ color: 'var(--th-text-muted)' }}
                    >
                      <Clock className="w-3.5 h-3.5" /> Ingested
                    </span>
                    <span style={{ color: 'var(--th-text-muted)' }}>
                      {formatDate(doc.uploaded_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span style={{ color: 'var(--th-text-muted)' }}>Status</span>
                    <span className={`badge ${doc.status === 'ready' ? 'badge-low' : 'badge-info'}`}>
                      {doc.status === 'ready' ? 'Analyzed' : doc.status}
                    </span>
                  </div>
                </div>

                {/* Card footer actions */}
                <div
                  className="p-3.5 flex items-center justify-between gap-3"
                  style={{
                    borderTop: '1px solid var(--th-border-subtle)',
                    background: 'var(--th-overlay-faint)',
                    borderRadius: '0 0 var(--radius-md) var(--radius-md)',
                  }}
                >
                  <div className="flex items-center gap-1">
                    <Link
                      to={`/documents/${doc.id}?tab=chat`}
                      className="btn-ghost p-2 text-xs"
                      style={{ color: 'var(--th-text-muted)' }}
                      title="Q&A Chat"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </Link>
                    <Link
                      to="/compare"
                      className="btn-ghost p-2 text-xs"
                      style={{ color: 'var(--th-text-muted)' }}
                      title="Compare against another"
                    >
                      <GitCompare className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                  <Link
                    to={`/documents/${doc.id}`}
                    className="btn-primary text-xs py-2 px-4"
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
