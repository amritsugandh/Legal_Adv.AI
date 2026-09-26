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
  employment_contract: 'Employment',
  rental_agreement: 'Rental / Lease',
  loan_agreement: 'Loan & Finance',
  nda: 'Non-Disclosure (NDA)',
  service_agreement: 'Master Service',
  partnership_agreement: 'Partnership',
  other: 'General Agreement',
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
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    fetchDocuments()
  }, [])

  async function fetchDocuments() {
    try {
      setLoading(true)
      const docs = await listDocuments()
      setDocuments(docs)
    } catch (err) {
      toast.error(err.message || 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id, filename) {
    if (deleting) return
    const confirmed = window.confirm(`Delete "${filename}"? This cannot be undone.`)
    if (!confirmed) return

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

  const analyzedCount = documents.filter((doc) => doc.status === 'ready').length
  const totalPages = documents.reduce((sum, doc) => sum + (Number(doc.page_count) || 0), 0)
  const query = search.trim().toLowerCase()
  const filtered = documents.filter((doc) => {
    const filename = (doc.filename || '').toLowerCase()
    const type = (doc.document_type || '').toLowerCase()
    return filename.includes(query) || type.includes(query)
  })

  if (loading) return <LoadingSpinner text="Loading documents repository..." />

  return (
    <div className="page-stack">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="page-header"
      >
        <div className="page-title-block">
          <div className="icon-box">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="page-kicker">Intelligence Workspace</p>
            <h1 className="page-title">Executive Dashboard</h1>
            <p className="page-description">
              Manage uploaded legal agreements, extract critical clauses, evaluate risk profiles, and cross-compare contracts.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
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

      {/* KPI Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Indexed Documents</span>
          <span className="stat-value">{documents.length}</span>
        </div>
        <div className="stat-card stat-card-success">
          <span className="stat-label">AI Analyzed</span>
          <span className="stat-value">
            {analyzedCount}
            <FileCheck2 className="w-5 h-5 text-[var(--color-aurora-green)] ml-1" />
          </span>
        </div>
        <div className="stat-card stat-card-gold">
          <span className="stat-label">Total Clauses & Pages</span>
          <span className="stat-value">
            {totalPages}
            <span className="text-sm font-mono font-medium text-[var(--color-text-muted)]">PAGES</span>
          </span>
        </div>
      </div>

      {/* Search and Filter Strip */}
      {documents.length > 0 && (
        <div className="section-panel py-3.5 px-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
            <input
              type="text"
              placeholder="Filter by document title, agreement type, or keywords..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10 h-10"
            />
          </div>
          <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)] whitespace-nowrap">
            <span>
              Showing{' '}
              <strong className="text-[var(--color-text-primary)]">{filtered.length}</strong>{' '}
              of {documents.length} agreements
            </span>
            {search && (
              <button
                onClick={() => setSearch('')}
                className="text-[var(--color-aurora-purple)] hover:underline font-bold"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Document Grid / Empty States */}
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
          description={`No documents match your query "${search}".`}
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
                className="card card-interactive flex flex-col justify-between"
              >
                {/* Top strip */}
                <div
                  className="p-4 flex items-start justify-between gap-3"
                  style={{
                    borderBottom: '1px solid rgba(100, 120, 200, 0.12)',
                    background: 'linear-gradient(135deg, rgba(10, 12, 26, 0.7), rgba(14, 18, 37, 0.6))',
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{
                        background: 'linear-gradient(135deg, rgba(108, 92, 231, 0.12), rgba(0, 206, 201, 0.08))',
                        border: '1px solid rgba(108, 92, 231, 0.2)',
                        color: 'var(--color-aurora-purple)',
                      }}
                    >
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-[var(--color-text-primary)] truncate" title={doc.filename}>
                        {doc.filename}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded"
                          style={{
                            background: 'rgba(108, 92, 231, 0.1)',
                            border: '1px solid rgba(108, 92, 231, 0.15)',
                            color: 'var(--color-aurora-purple)',
                          }}
                        >
                          {doc.file_type || 'PDF'}
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {docTypeLabels[doc.document_type] || doc.document_type || 'Contract'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => { e.preventDefault(); handleDelete(doc.id, doc.filename) }}
                    disabled={deleting === doc.id}
                    className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors rounded-lg hover:bg-[rgba(255,118,117,0.08)]"
                    title="Delete document"
                    aria-label={`Delete ${doc.filename}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Details body */}
                <div className="p-4 space-y-3 text-xs text-[var(--color-text-secondary)]">
                  <div
                    className="flex items-center justify-between py-1.5"
                    style={{ borderBottom: '1px solid rgba(100, 120, 200, 0.08)' }}
                  >
                    <span className="text-[var(--color-text-muted)] flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5" /> Length
                    </span>
                    <span className="font-mono font-semibold text-[var(--color-text-primary)]">
                      {doc.page_count} page{doc.page_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div
                    className="flex items-center justify-between py-1.5"
                    style={{ borderBottom: '1px solid rgba(100, 120, 200, 0.08)' }}
                  >
                    <span className="text-[var(--color-text-muted)] flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" /> Ingested
                    </span>
                    <span className="text-[var(--color-text-muted)]">
                      {formatDate(doc.uploaded_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[var(--color-text-muted)]">Status</span>
                    <span className={`badge ${doc.status === 'ready' ? 'badge-low' : 'badge-info'}`}>
                      {doc.status === 'ready' ? 'Fully Analyzed' : doc.status}
                    </span>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div
                  className="p-3.5 flex items-center justify-between gap-3"
                  style={{
                    borderTop: '1px solid rgba(100, 120, 200, 0.12)',
                    background: 'linear-gradient(135deg, rgba(10, 12, 26, 0.5), rgba(14, 18, 37, 0.4))',
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <Link
                      to={`/documents/${doc.id}?tab=chat`}
                      className="btn-ghost p-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                      title="Q&A Chat"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </Link>
                    <Link
                      to="/compare"
                      className="btn-ghost p-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
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
