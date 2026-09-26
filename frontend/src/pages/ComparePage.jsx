import React, { useState, useEffect, Fragment } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GitCompare, Upload, FileText, ArrowRight,
  AlertTriangle, X, Info, RefreshCw, PlusCircle, Download,
  Eye, EyeOff, Layers, ChevronDown
} from 'lucide-react'
import { compareByIds, compareByUpload, exportComparisonCsv } from '../services/comparison'
import { listDocuments } from '../services/documents'
import SeverityBadge from '../components/ui/SeverityBadge'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

/* ─── Helpers ──────────────────────────────────────── */
function renderItemText(item) {
  if (item === null || item === undefined) return ''
  if (typeof item === 'string') return item
  if (typeof item === 'number' || typeof item === 'boolean') return String(item)
  if (typeof item === 'object') {
    return item.change || item.text || item.description ||
           item.clause || item.point || item.topic || JSON.stringify(item)
  }
  return String(item)
}

/* ─── Word-level LCS diff ──────────────────────────── */
function computeWordDiff(textA, textB) {
  const strA = typeof textA === 'string' ? textA : (textA ? JSON.stringify(textA) : '')
  const strB = typeof textB === 'string' ? textB : (textB ? JSON.stringify(textB) : '')

  if (!strA && !strB) return []
  if (!strA) return [{ type: 'added',   text: strB }]
  if (!strB) return [{ type: 'removed', text: strA }]
  if (strA === strB) return [{ type: 'same', text: strA }]

  const tokensA = strA.match(/\S+|\s+/g) || []
  const tokensB = strB.match(/\S+|\s+/g) || []
  const n = tokensA.length
  const m = tokensB.length

  // Safety cap to avoid quadratic memory on huge clauses
  if (n > 500 || m > 500) {
    return [
      { type: 'removed', text: strA },
      { type: 'added',   text: strB },
    ]
  }

  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1))
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      dp[i + 1][j + 1] = tokensA[i] === tokensB[j]
        ? dp[i][j] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  let i = n, j = m
  const result = []
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && tokensA[i - 1] === tokensB[j - 1]) {
      result.unshift({ type: 'same',    text: tokensA[i - 1] }); i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'added',   text: tokensB[j - 1] }); j--
    } else {
      result.unshift({ type: 'removed', text: tokensA[i - 1] }); i--
    }
  }

  // Merge adjacent same-type tokens
  const merged = []
  for (const token of result) {
    if (merged.length > 0 && merged[merged.length - 1].type === token.type) {
      merged[merged.length - 1].text += token.text
    } else {
      merged.push({ ...token })
    }
  }
  return merged
}

/* ─── Redline Diff Renderer ────────────────────────── */
function RedlineDiffView({ textA, textB }) {
  const diff = computeWordDiff(textA, textB)

  return (
    <div
      className="p-4 rounded-xl space-y-3 font-mono text-xs"
      style={{
        background: 'var(--th-raw-bg)',
        border: '1px solid rgba(108,92,231,0.25)',
        boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.06)',
      }}
    >
      {/* Legend */}
      <div
        className="flex flex-wrap items-center justify-between gap-2 pb-2.5 text-[10px] font-bold uppercase tracking-wider"
        style={{ borderBottom: '1px solid var(--th-border-subtle)' }}
      >
        <span
          className="flex items-center gap-1.5"
          style={{ color: 'var(--color-aurora-cyan)' }}
        >
          <Layers className="w-3.5 h-3.5" />
          Interactive Redline Diff
        </span>
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded"
            style={{
              color: '#f87171',
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.2)',
            }}
          >
            <span className="font-mono font-bold">−</span> Removed from Doc A
          </span>
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded"
            style={{
              color: '#34d399',
              background: 'rgba(52,211,153,0.12)',
              border: '1px solid rgba(52,211,153,0.2)',
            }}
          >
            <span className="font-mono font-bold">+</span> Added in Doc B
          </span>
        </div>
      </div>

      {/* Diff output */}
      <div
        className="leading-relaxed select-text whitespace-pre-wrap"
        style={{ color: 'var(--th-text-secondary)' }}
      >
        {diff.map((part, idx) => {
          if (part.type === 'removed') {
            return (
              <span
                key={idx}
                className="line-through decoration-1 px-1 py-0.5 rounded mx-0.5"
                style={{
                  background: 'rgba(239,68,68,0.15)',
                  color: '#f87171',
                  textDecorationColor: 'rgba(239,68,68,0.6)',
                }}
                title="Deleted from baseline contract"
              >
                {part.text}
              </span>
            )
          }
          if (part.type === 'added') {
            return (
              <span
                key={idx}
                className="font-semibold px-1 py-0.5 rounded mx-0.5"
                style={{
                  background: 'rgba(52,211,153,0.15)',
                  color: '#34d399',
                  border: '1px solid rgba(52,211,153,0.25)',
                }}
                title="Added in new target contract"
              >
                {part.text}
              </span>
            )
          }
          return (
            <span key={idx} style={{ color: 'var(--th-text-secondary)' }}>
              {part.text}
            </span>
          )
        })}
      </div>
    </div>
  )
}


/* ══════════════════════════════════════════════════════
   ROOT COMPARE PAGE
══════════════════════════════════════════════════════ */
export default function ComparePage() {
  const [mode, setMode]       = useState('upload')
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)

  return (
    <div className="page-stack">

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="page-header"
      >
        <div className="page-title-block">
          <div className="icon-box">
            <GitCompare className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="page-kicker">Cross-Document Auditing</p>
            <h1 className="page-title">Contract Comparison</h1>
            <p className="page-description">
              Compare two agreements side-by-side to pinpoint changed covenants, altered notice
              windows, and shifted liabilities.
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── Mode Selector ── */}
      {!result && (
        <div className="tab-nav w-fit">
          <button
            className={`tab-item ${mode === 'upload' ? 'active' : ''}`}
            onClick={() => setMode('upload')}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload 2 Files
          </button>
          <button
            className={`tab-item ${mode === 'existing' ? 'active' : ''}`}
            onClick={() => setMode('existing')}
          >
            <FileText className="w-3.5 h-3.5" />
            From Repository
          </button>
        </div>
      )}

      {/* ── Input panels ── */}
      <AnimatePresence mode="wait">
        {!result && !loading && (
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {mode === 'upload'
              ? <UploadCompare  onResult={setResult} onLoading={setLoading} />
              : <ExistingCompare onResult={setResult} onLoading={setLoading} />}
          </motion.div>
        )}
      </AnimatePresence>

      {loading && <LoadingSpinner text="Performing deep comparative clause analysis..." />}
      {result  && <ComparisonResultView result={result} onReset={() => setResult(null)} />}
    </div>
  )
}


/* ── Upload two new files ──────────────────────────── */
function UploadCompare({ onResult, onLoading }) {
  const [fileA, setFileA] = useState(null)
  const [fileB, setFileB] = useState(null)

  async function handleCompare() {
    if (!fileA || !fileB) return
    onLoading(true)
    try {
      onResult(await compareByUpload(fileA, fileB))
    } catch (err) {
      toast.error(err.message || 'Comparison processing failed')
    } finally {
      onLoading(false)
    }
  }

  return (
    <div className="section-panel space-y-7">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FilePickerCard
          label="Document A — Original / Baseline"
          file={fileA}
          onSelect={setFileA}
          onClear={() => setFileA(null)}
          badge="Baseline"
        />
        <FilePickerCard
          label="Document B — Revised / Counterparty"
          file={fileB}
          onSelect={setFileB}
          onClear={() => setFileB(null)}
          badge="Target"
        />
      </div>

      <div
        className="pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        style={{ borderTop: '1px solid var(--th-border-subtle)' }}
      >
        <p className="text-xs" style={{ color: 'var(--th-text-muted)' }}>
          Both documents will be parsed and evaluated against standard legal covenants.
        </p>
        <button
          onClick={handleCompare}
          disabled={!fileA || !fileB}
          className="btn-primary flex-shrink-0 flex items-center gap-2"
        >
          <GitCompare className="w-4 h-4" />
          Run Comparative Audit
        </button>
      </div>
    </div>
  )
}


/* ── Single file picker card ───────────────────────── */
function FilePickerCard({ label, file, onSelect, onClear, badge }) {
  function handleChange(e) {
    const f = e.target.files?.[0]
    if (f) onSelect(f)
  }

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <span
          className="text-xs font-mono font-bold uppercase tracking-wider"
          style={{ color: 'var(--th-text-primary)' }}
        >
          {label}
        </span>
        <span className="badge badge-info text-[10px] flex-shrink-0">{badge}</span>
      </div>

      {file ? (
        <div
          className="p-3.5 rounded-lg flex items-center justify-between gap-3"
          style={{
            background: 'var(--th-overlay-dark)',
            border: '1px solid rgba(108,92,231,0.2)',
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
              <p
                className="text-xs font-bold truncate"
                style={{ color: 'var(--th-text-primary)' }}
              >
                {file.name}
              </p>
              <p
                className="text-[11px] font-mono mt-0.5"
                style={{ color: 'var(--th-text-muted)' }}
              >
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <button
            onClick={onClear}
            className="btn-ghost p-1.5 flex-shrink-0"
            style={{ color: 'var(--color-danger)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <label className="dropzone py-7 block cursor-pointer">
          <input type="file" accept=".pdf,.docx" onChange={handleChange} className="hidden" />
          <div className="flex flex-col items-center gap-3 text-xs">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{
                background: 'var(--th-icon-box-bg)',
                border: '1px solid var(--th-icon-box-bd)',
                color: 'var(--color-aurora-purple)',
              }}
            >
              <Upload className="w-4 h-4" />
            </div>
            <span className="font-bold" style={{ color: 'var(--th-text-primary)' }}>
              Choose Agreement File
            </span>
            <span className="font-mono" style={{ color: 'var(--th-text-muted)' }}>
              PDF or DOCX
            </span>
          </div>
        </label>
      )}
    </div>
  )
}


/* ── Select from existing repository ──────────────── */
function ExistingCompare({ onResult, onLoading }) {
  const [documents, setDocuments]   = useState([])
  const [loadingDocs, setLoadingDocs] = useState(true)
  const [docAId, setDocAId]         = useState('')
  const [docBId, setDocBId]         = useState('')

  useEffect(() => {
    (async () => {
      try   { setDocuments(await listDocuments()) }
      catch { toast.error('Failed to load document catalog') }
      finally { setLoadingDocs(false) }
    })()
  }, [])

  async function handleCompare() {
    if (!docAId || !docBId) return
    if (docAId === docBId) { toast.error('Please choose two different agreements'); return }
    onLoading(true)
    try {
      onResult(await compareByIds(docAId, docBId))
    } catch (err) {
      toast.error(err.message || 'Comparison failed')
    } finally {
      onLoading(false)
    }
  }

  if (loadingDocs) return <LoadingSpinner text="Retrieving available agreements..." />

  if (documents.length < 2) {
    return (
      <div className="section-panel text-center py-12 space-y-5">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto"
          style={{
            background: 'var(--th-icon-box-bg)',
            border: '1px solid var(--th-border-subtle)',
          }}
        >
          <Info
            className="w-7 h-7"
            style={{ color: 'var(--th-text-muted)', opacity: 0.5 }}
          />
        </div>
        <div>
          <h4 className="text-sm font-bold" style={{ color: 'var(--th-text-primary)' }}>
            At Least Two Documents Required
          </h4>
          <p
            className="text-xs mt-2 max-w-sm mx-auto"
            style={{ color: 'var(--th-text-muted)' }}
          >
            You currently have {documents.length} document{documents.length !== 1 ? 's' : ''}.
            Upload another contract to enable comparison.
          </p>
        </div>
        <Link to="/upload" className="btn-primary inline-flex items-center gap-2 text-xs">
          <PlusCircle className="w-3.5 h-3.5" />
          Upload Second Agreement
        </Link>
      </div>
    )
  }

  return (
    <div className="section-panel space-y-7">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Doc A */}
        <div className="card p-5 space-y-3">
          <label
            className="block text-xs font-mono font-bold uppercase tracking-wider"
            style={{ color: 'var(--th-text-primary)' }}
          >
            Document A — Original Baseline
          </label>
          <div className="relative">
            <select
              value={docAId}
              onChange={(e) => setDocAId(e.target.value)}
              className="input appearance-none pr-10 cursor-pointer text-xs"
            >
              <option value="">Select baseline document...</option>
              {documents.map((d) => (
                <option key={d.id} value={d.id}>{d.filename}</option>
              ))}
            </select>
            <ChevronDown
              className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
              style={{ color: 'var(--th-text-muted)' }}
            />
          </div>
        </div>

        {/* Doc B */}
        <div className="card p-5 space-y-3">
          <label
            className="block text-xs font-mono font-bold uppercase tracking-wider"
            style={{ color: 'var(--th-text-primary)' }}
          >
            Document B — Comparison Target
          </label>
          <div className="relative">
            <select
              value={docBId}
              onChange={(e) => setDocBId(e.target.value)}
              className="input appearance-none pr-10 cursor-pointer text-xs"
            >
              <option value="">Select comparison target...</option>
              {documents.map((d) => (
                <option key={d.id} value={d.id}>{d.filename}</option>
              ))}
            </select>
            <ChevronDown
              className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
              style={{ color: 'var(--th-text-muted)' }}
            />
          </div>
        </div>
      </div>

      <div
        className="pt-4 flex items-center justify-end"
        style={{ borderTop: '1px solid var(--th-border-subtle)' }}
      >
        <button
          onClick={handleCompare}
          disabled={!docAId || !docBId || docAId === docBId}
          className="btn-primary flex items-center gap-2"
        >
          <GitCompare className="w-4 h-4" />
          Compare Selected Agreements
        </button>
      </div>
    </div>
  )
}


/* ── Comparison Results View ───────────────────────── */
function ComparisonResultView({ result, onReset }) {
  const [expandedRows, setExpandedRows]   = useState({})
  const [showAllRedlines, setShowAllRedlines] = useState(false)

  const toggleRow = (idx) =>
    setExpandedRows((prev) => ({ ...prev, [idx]: !prev[idx] }))

  const alteredCount = result.comparison_table?.filter((r) => r.has_change)?.length || 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header strip */}
      <div className="card p-5 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex flex-wrap items-center gap-4">
          {/* Doc A label */}
          <div
            className="px-4 py-2.5 rounded-lg text-xs font-bold"
            style={{
              background: 'var(--th-overlay-dark)',
              border: '1px solid var(--th-border-subtle)',
              color: 'var(--th-text-primary)',
            }}
          >
            <span
              className="text-[10px] font-mono block uppercase mb-0.5"
              style={{ color: 'var(--th-text-muted)' }}
            >
              Doc A
            </span>
            {renderItemText(result.document_a_name)}
          </div>
          <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--th-text-muted)' }} />
          {/* Doc B label */}
          <div
            className="px-4 py-2.5 rounded-lg text-xs font-bold"
            style={{
              background: 'var(--th-overlay-dark)',
              border: '1px solid var(--th-border-subtle)',
              color: 'var(--th-text-primary)',
            }}
          >
            <span
              className="text-[10px] font-mono block uppercase mb-0.5"
              style={{ color: 'var(--th-text-muted)' }}
            >
              Doc B
            </span>
            {renderItemText(result.document_b_name)}
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
          <button
            onClick={() => exportComparisonCsv(result)}
            className="btn-secondary text-xs flex items-center gap-1.5"
            title="Download comparison matrix as CSV"
          >
            <Download className="w-3.5 h-3.5" style={{ color: 'var(--color-aurora-cyan)' }} />
            Export CSV
          </button>
          <button
            onClick={onReset}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            New Comparison
          </button>
        </div>
      </div>

      {/* Executive summary */}
      {result.summary && (
        <div className="card">
          <div className="panel-header-strip">
            <h3
              className="text-xs font-mono font-bold uppercase tracking-wider"
              style={{ color: 'var(--th-text-primary)' }}
            >
              Executive Comparative Summary
            </h3>
          </div>
          <div className="p-6">
            <p className="text-xs leading-relaxed" style={{ color: 'var(--th-text-secondary)' }}>
              {renderItemText(result.summary)}
            </p>
          </div>
        </div>
      )}

      {/* Material changes */}
      {result.important_changes?.length > 0 && (
        <div className="card">
          <div className="panel-header-strip">
            <div
              className="flex items-center gap-2.5 text-xs font-mono font-bold uppercase tracking-wider"
              style={{ color: 'var(--color-warning)' }}
            >
              <AlertTriangle className="w-4 h-4" />
              Material Contract Alterations
            </div>
            <span
              className="text-xs font-mono"
              style={{ color: 'var(--th-text-muted)' }}
            >
              {result.important_changes.length} Flags
            </span>
          </div>
          <div className="p-6 space-y-3">
            {result.important_changes.map((change, i) => (
              <div
                key={i}
                className="flex items-start gap-3 text-xs"
                style={{ color: 'var(--th-text-secondary)' }}
              >
                <span
                  className="font-mono font-bold flex-shrink-0"
                  style={{ color: 'var(--color-gold)' }}
                >
                  {i + 1}.
                </span>
                <span className="leading-relaxed">{renderItemText(change)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clause-by-clause comparison table */}
      {result.comparison_table?.length > 0 && (
        <div className="card overflow-hidden">
          <div className="panel-header-strip flex-wrap gap-3">
            <div>
              <h3
                className="text-xs font-mono font-bold uppercase tracking-wider"
                style={{ color: 'var(--th-text-primary)' }}
              >
                Clause-by-Clause Comparison Matrix
              </h3>
              <p
                className="text-[11px] mt-0.5"
                style={{ color: 'var(--th-text-muted)' }}
              >
                {alteredCount} altered clause{alteredCount !== 1 ? 's' : ''} detected
              </p>
            </div>
            {alteredCount > 0 && (
              <button
                onClick={() => setShowAllRedlines(!showAllRedlines)}
                className="btn-secondary text-[11px] py-1 px-3 flex items-center gap-1.5"
              >
                <Layers
                  className="w-3.5 h-3.5"
                  style={{ color: 'var(--color-aurora-cyan)' }}
                />
                {showAllRedlines ? 'Collapse All Redlines' : 'Expand All Redlines'}
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--th-table-border)',
                    background: 'var(--th-table-head-bg)',
                  }}
                >
                  {['Clause Topic', 'Document A', 'Document B', 'Change', 'Risk', 'Redline'].map((h, hi) => (
                    <th
                      key={h}
                      className={`px-5 py-3.5 font-mono uppercase text-[10px] font-bold ${hi >= 3 ? 'text-center' : ''}`}
                      style={{ color: 'var(--th-text-muted)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.comparison_table.map((row, i) => {
                  const isExpanded = showAllRedlines || !!expandedRows[i]
                  return (
                    <Fragment key={i}>
                      <tr
                        style={{
                          borderBottom: isExpanded ? 'none' : `1px solid var(--th-table-border)`,
                          background: row.has_change ? 'var(--th-row-changed)' : 'transparent',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--th-row-hover)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = row.has_change
                            ? 'var(--th-row-changed)'
                            : 'transparent'
                        }}
                      >
                        {/* Topic */}
                        <td
                          className="px-5 py-3.5 font-bold align-top whitespace-nowrap"
                          style={{ color: 'var(--th-text-primary)' }}
                        >
                          {renderItemText(row.topic)}
                        </td>
                        {/* Doc A */}
                        <td
                          className="px-5 py-3.5 align-top leading-relaxed max-w-xs"
                          style={{ color: 'var(--th-text-secondary)' }}
                        >
                          {renderItemText(row.document_a)}
                        </td>
                        {/* Doc B */}
                        <td
                          className="px-5 py-3.5 align-top leading-relaxed max-w-xs"
                          style={{ color: 'var(--th-text-secondary)' }}
                        >
                          {renderItemText(row.document_b)}
                        </td>
                        {/* Changed badge */}
                        <td className="px-5 py-3.5 text-center align-top whitespace-nowrap">
                          {row.has_change
                            ? <span className="badge badge-medium text-[10px]">Altered</span>
                            : <span className="badge badge-low    text-[10px]">Identical</span>}
                        </td>
                        {/* Severity */}
                        <td className="px-5 py-3.5 text-center align-top whitespace-nowrap">
                          <SeverityBadge severity={row.severity} />
                        </td>
                        {/* Redline toggle */}
                        <td className="px-5 py-3.5 text-center align-top whitespace-nowrap">
                          {row.has_change ? (
                            <button
                              onClick={() => toggleRow(i)}
                              className="btn-ghost text-[10px] py-1 px-2.5 rounded flex items-center gap-1.5 mx-auto"
                              style={
                                isExpanded
                                  ? {
                                      color: 'var(--color-aurora-cyan)',
                                      border: '1px solid rgba(0,206,201,0.3)',
                                      background: 'rgba(0,206,201,0.08)',
                                    }
                                  : {
                                      color: 'var(--th-text-secondary)',
                                      border: '1px solid var(--th-border-subtle)',
                                    }
                              }
                              title="Toggle word-level redline diff"
                            >
                              {isExpanded
                                ? <><EyeOff className="w-3 h-3" /> Hide</>
                                : <><Eye    className="w-3 h-3" /> View</>}
                            </button>
                          ) : (
                            <span
                              className="text-[10px] font-mono"
                              style={{ color: 'var(--th-text-muted)' }}
                            >
                              —
                            </span>
                          )}
                        </td>
                      </tr>

                      {/* Accordion redline row */}
                      {isExpanded && row.has_change && (
                        <tr
                          style={{
                            borderBottom: `1px solid var(--th-table-border)`,
                            background: 'var(--th-overlay-faint)',
                          }}
                        >
                          <td
                            colSpan={6}
                            className="px-5 py-3"
                          >
                            <RedlineDiffView
                              textA={renderItemText(row.document_a)}
                              textB={renderItemText(row.document_b)}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  )
}
