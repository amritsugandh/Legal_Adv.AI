import React, { useState, useEffect, Fragment } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GitCompare, Upload, FileText, ArrowRight,
  AlertTriangle, ChevronDown, X, Info, RefreshCw, PlusCircle, Download,
  Eye, EyeOff, Layers
} from 'lucide-react'
import { compareByIds, compareByUpload, exportComparisonCsv } from '../services/comparison'
import { listDocuments } from '../services/documents'
import SeverityBadge from '../components/ui/SeverityBadge'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

function renderItemText(item) {
  if (item === null || item === undefined) return ''
  if (typeof item === 'string') return item
  if (typeof item === 'number' || typeof item === 'boolean') return String(item)
  if (typeof item === 'object') {
    return item.change || item.text || item.description || item.clause || item.point || item.topic || JSON.stringify(item)
  }
  return String(item)
}

// Word-level LCS Diff Algorithm for Contract Redlining
function computeWordDiff(textA, textB) {
  const strA = typeof textA === 'string' ? textA : (textA ? JSON.stringify(textA) : '')
  const strB = typeof textB === 'string' ? textB : (textB ? JSON.stringify(textB) : '')

  if (!strA && !strB) return []
  if (!strA) return [{ type: 'added', text: strB }]
  if (!strB) return [{ type: 'removed', text: strA }]
  if (strA === strB) return [{ type: 'same', text: strA }]

  // Split into whitespace and non-whitespace tokens
  const tokensA = strA.match(/\S+|\s+/g) || []
  const tokensB = strB.match(/\S+|\s+/g) || []

  const n = tokensA.length
  const m = tokensB.length

  // Safety threshold for extremely long clauses to avoid quadratic memory spikes
  if (n > 500 || m > 500) {
    return [
      { type: 'removed', text: strA },
      { type: 'added', text: strB },
    ]
  }

  // DP table
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1))
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      if (tokensA[i] === tokensB[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1])
      }
    }
  }

  // Backtrack
  let i = n
  let j = m
  const result = []
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && tokensA[i - 1] === tokensB[j - 1]) {
      result.unshift({ type: 'same', text: tokensA[i - 1] })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'added', text: tokensB[j - 1] })
      j--
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      result.unshift({ type: 'removed', text: tokensA[i - 1] })
      i--
    }
  }

  // Merge adjacent tokens with the same diff status
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

function RedlineDiffView({ textA, textB }) {
  const diff = computeWordDiff(textA, textB)

  return (
    <div className="p-4 rounded-xl bg-[rgba(10,12,26,0.92)] border border-[rgba(108,92,231,0.25)] shadow-inner space-y-3 font-mono text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-white/10 text-[10px] font-bold uppercase tracking-wider">
        <span className="text-[var(--color-aurora-cyan)] flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5" />
          Interactive Redline Diff
        </span>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 text-red-400 bg-red-500/15 px-2 py-0.5 rounded border border-red-500/25">
            <span className="font-mono font-bold">-</span> Removed from Doc A
          </span>
          <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/25">
            <span className="font-mono font-bold">+</span> Added in Doc B
          </span>
        </div>
      </div>
      <div className="leading-relaxed select-text whitespace-pre-wrap">
        {diff.map((part, idx) => {
          if (part.type === 'removed') {
            return (
              <span
                key={idx}
                className="bg-red-500/20 text-red-300 line-through decoration-red-400/80 decoration-1 px-1 py-0.5 rounded mx-0.5"
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
                className="bg-emerald-500/20 text-emerald-300 font-semibold px-1 py-0.5 rounded mx-0.5 border border-emerald-500/30"
                title="Added in new target contract"
              >
                {part.text}
              </span>
            )
          }
          return (
            <span key={idx} className="text-[var(--color-text-secondary)]">
              {part.text}
            </span>
          )
        })}
      </div>
    </div>
  )
}


export default function ComparePage() {
  const [mode, setMode] = useState('upload')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

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
            <GitCompare className="w-5 h-5" />
          </div>
          <div>
            <p className="page-kicker">Cross-Document Auditing</p>
            <h1 className="page-title">Contract Comparison</h1>
            <p className="page-description">
              Compare two agreements side-by-side to pinpoint changed covenants, altered notice windows, and shifted liabilities.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Mode Selector */}
      {!result && (
        <div className="tab-nav w-fit">
          <button
            className={`tab-item ${mode === 'upload' ? 'active' : ''}`}
            onClick={() => setMode('upload')}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload 2 Files to Compare
          </button>
          <button
            className={`tab-item ${mode === 'existing' ? 'active' : ''}`}
            onClick={() => setMode('existing')}
          >
            <FileText className="w-3.5 h-3.5" />
            Select from Repository
          </button>
        </div>
      )}

      {/* Comparison Input Panels */}
      <AnimatePresence mode="wait">
        {!result && !loading && (
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {mode === 'upload' ? (
              <UploadCompare onResult={setResult} onLoading={setLoading} />
            ) : (
              <ExistingCompare onResult={setResult} onLoading={setLoading} />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {loading && <LoadingSpinner text="Performing deep comparative clause analysis..." />}
      {result && <ComparisonResultView result={result} onReset={() => setResult(null)} />}
    </div>
  )
}

function UploadCompare({ onResult, onLoading }) {
  const [fileA, setFileA] = useState(null)
  const [fileB, setFileB] = useState(null)

  async function handleCompare() {
    if (!fileA || !fileB) return
    onLoading(true)
    try {
      const res = await compareByUpload(fileA, fileB)
      onResult(res)
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
          label="Document A (Original / Baseline)"
          file={fileA}
          onSelect={setFileA}
          onClear={() => setFileA(null)}
          badge="Baseline"
        />
        <FilePickerCard
          label="Document B (Revised / Counterparty Version)"
          file={fileB}
          onSelect={setFileB}
          onClear={() => setFileB(null)}
          badge="Comparison Target"
        />
      </div>

      <div
        className="pt-4 flex items-center justify-between"
        style={{ borderTop: '1px solid rgba(100, 120, 200, 0.12)' }}
      >
        <p className="text-xs text-[var(--color-text-muted)]">
          Both documents will be parsed and evaluated against standard legal covenants.
        </p>
        <button
          onClick={handleCompare}
          disabled={!fileA || !fileB}
          className="btn-primary"
        >
          <GitCompare className="w-4 h-4" />
          Run Comparative Audit
        </button>
      </div>
    </div>
  )
}

function FilePickerCard({ label, file, onSelect, onClear, badge }) {
  function handleChange(e) {
    const f = e.target.files?.[0]
    if (f) onSelect(f)
  }

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
          {label}
        </span>
        <span className="badge badge-info text-[10px]">{badge}</span>
      </div>

      {file ? (
        <div
          className="p-3.5 rounded-lg flex items-center justify-between gap-3"
          style={{
            background: 'rgba(10, 12, 26, 0.6)',
            border: '1px solid rgba(108, 92, 231, 0.2)',
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
              <p className="text-xs font-bold text-[var(--color-text-primary)] truncate">{file.name}</p>
              <p className="text-[11px] font-mono text-[var(--color-text-muted)] mt-0.5">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <button onClick={onClear} className="btn-ghost p-1.5 text-[var(--color-danger)] hover:bg-[rgba(255,118,117,0.08)]">
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
                background: 'linear-gradient(135deg, rgba(108, 92, 231, 0.1), rgba(0, 206, 201, 0.06))',
                border: '1px solid rgba(100, 120, 200, 0.15)',
                color: 'var(--color-aurora-purple)',
              }}
            >
              <Upload className="w-4 h-4" />
            </div>
            <span className="font-bold text-[var(--color-text-primary)]">Choose Agreement File</span>
            <span className="text-[11px] font-mono text-[var(--color-text-muted)]">PDF or DOCX</span>
          </div>
        </label>
      )}
    </div>
  )
}

function ExistingCompare({ onResult, onLoading }) {
  const [documents, setDocuments] = useState([])
  const [loadingDocs, setLoadingDocs] = useState(true)
  const [docAId, setDocAId] = useState('')
  const [docBId, setDocBId] = useState('')

  useEffect(() => {
    (async () => {
      try {
        const docs = await listDocuments()
        setDocuments(docs)
      } catch (err) {
        toast.error('Failed to load document catalog')
      } finally {
        setLoadingDocs(false)
      }
    })()
  }, [])

  async function handleCompare() {
    if (!docAId || !docBId) return
    if (docAId === docBId) {
      toast.error('Please choose two different agreements')
      return
    }
    onLoading(true)
    try {
      const res = await compareByIds(docAId, docBId)
      onResult(res)
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
            background: 'linear-gradient(135deg, rgba(108, 92, 231, 0.08), rgba(0, 206, 201, 0.05))',
            border: '1px solid rgba(100, 120, 200, 0.12)',
          }}
        >
          <Info className="w-7 h-7 text-[var(--color-text-muted)]" style={{ opacity: 0.5 }} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-[var(--color-text-primary)]">
            At Least Two Documents Required
          </h4>
          <p className="text-xs text-[var(--color-text-muted)] mt-2 max-w-sm mx-auto">
            You currently have {documents.length} document{documents.length !== 1 ? 's' : ''} in your workspace. Upload another contract to enable side-by-side comparison.
          </p>
        </div>
        <Link to="/upload" className="btn-primary inline-flex text-xs">
          <PlusCircle className="w-3.5 h-3.5" />
          Upload Second Agreement
        </Link>
      </div>
    )
  }

  return (
    <div className="section-panel space-y-7">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-5 space-y-3">
          <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
            Document A (Original Baseline)
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
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)] pointer-events-none" />
          </div>
        </div>

        <div className="card p-5 space-y-3">
          <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
            Document B (Comparison Target)
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
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)] pointer-events-none" />
          </div>
        </div>
      </div>

      <div
        className="pt-4 flex items-center justify-end"
        style={{ borderTop: '1px solid rgba(100, 120, 200, 0.12)' }}
      >
        <button
          onClick={handleCompare}
          disabled={!docAId || !docBId || docAId === docBId}
          className="btn-primary"
        >
          <GitCompare className="w-4 h-4" />
          Compare Selected Agreements
        </button>
      </div>
    </div>
  )
}

function ComparisonResultView({ result, onReset }) {
  const [expandedRows, setExpandedRows] = useState({})
  const [showAllRedlines, setShowAllRedlines] = useState(false)

  const toggleRow = (idx) => {
    setExpandedRows((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }))
  }

  const alteredRowCount = result.comparison_table?.filter((r) => r.has_change)?.length || 0

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header comparison strip */}
      <div className="card p-5 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex flex-wrap items-center gap-4">
          <div
            className="px-4 py-2.5 rounded-lg text-xs font-bold text-[var(--color-text-primary)]"
            style={{
              background: 'rgba(10, 12, 26, 0.7)',
              border: '1px solid rgba(100, 120, 200, 0.15)',
            }}
          >
            <span className="text-[10px] font-mono text-[var(--color-text-muted)] block uppercase mb-0.5">Doc A</span>
            {renderItemText(result.document_a_name)}
          </div>
          <ArrowRight className="w-4 h-4 text-[var(--color-text-muted)]" />
          <div
            className="px-4 py-2.5 rounded-lg text-xs font-bold text-[var(--color-text-primary)]"
            style={{
              background: 'rgba(10, 12, 26, 0.7)',
              border: '1px solid rgba(100, 120, 200, 0.15)',
            }}
          >
            <span className="text-[10px] font-mono text-[var(--color-text-muted)] block uppercase mb-0.5">Doc B</span>
            {renderItemText(result.document_b_name)}
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            onClick={() => exportComparisonCsv(result)}
            className="btn-secondary text-xs flex items-center gap-1.5"
            title="Download comparison matrix as CSV spreadsheet"
          >
            <Download className="w-3.5 h-3.5 text-[var(--color-aurora-cyan)]" />
            Export Matrix (CSV)
          </button>
          <button onClick={onReset} className="btn-secondary text-xs">
            <RefreshCw className="w-3.5 h-3.5" />
            New Comparison
          </button>
        </div>
      </div>

      {/* Summary */}
      {result.summary && (
        <div className="card">
          <div className="panel-header-strip">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
              Executive Comparative Summary
            </h3>
          </div>
          <div className="p-6">
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              {renderItemText(result.summary)}
            </p>
          </div>
        </div>
      )}

      {/* Key Differences */}
      {result.important_changes?.length > 0 && (
        <div className="card">
          <div className="panel-header-strip">
            <div className="flex items-center gap-2.5 text-xs font-mono font-bold uppercase tracking-wider text-[var(--color-warning)]">
              <AlertTriangle className="w-4 h-4" />
              Material Contract Alterations
            </div>
            <span className="text-xs font-mono text-[var(--color-text-muted)]">{result.important_changes.length} Flags</span>
          </div>
          <div className="p-6 space-y-3">
            {result.important_changes.map((change, i) => (
              <div key={i} className="flex items-start gap-3 text-xs text-[var(--color-text-secondary)]">
                <span className="font-mono font-bold text-[var(--color-gold)] flex-shrink-0">
                  {i + 1}.
                </span>
                <span className="leading-relaxed">{renderItemText(change)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Side-by-Side Comparison Matrix with Redlines */}
      {result.comparison_table?.length > 0 && (
        <div className="card overflow-hidden">
          <div className="panel-header-strip flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
                Clause-by-Clause Comparison Matrix
              </h3>
              <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                {alteredRowCount} altered clause{alteredRowCount !== 1 ? 's' : ''} detected across agreements
              </p>
            </div>
            {alteredRowCount > 0 && (
              <button
                onClick={() => setShowAllRedlines(!showAllRedlines)}
                className="btn-secondary text-[11px] py-1 px-3 flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5 text-[var(--color-aurora-cyan)]" />
                <span>{showAllRedlines ? 'Collapse All Redlines' : 'Expand All Redlines'}</span>
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(100, 120, 200, 0.12)', background: 'rgba(10, 12, 26, 0.5)' }}>
                  <th className="px-5 py-3.5 font-mono uppercase text-[10px] text-[var(--color-text-muted)] font-bold">Clause Topic</th>
                  <th className="px-5 py-3.5 font-mono uppercase text-[10px] text-[var(--color-text-muted)] font-bold">Document A</th>
                  <th className="px-5 py-3.5 font-mono uppercase text-[10px] text-[var(--color-text-muted)] font-bold">Document B</th>
                  <th className="px-5 py-3.5 font-mono uppercase text-[10px] text-[var(--color-text-muted)] font-bold text-center">Change</th>
                  <th className="px-5 py-3.5 font-mono uppercase text-[10px] text-[var(--color-text-muted)] font-bold text-center">Risk Level</th>
                  <th className="px-5 py-3.5 font-mono uppercase text-[10px] text-[var(--color-text-muted)] font-bold text-center">Redline</th>
                </tr>
              </thead>
              <tbody>
                {result.comparison_table.map((row, i) => {
                  const isExpanded = showAllRedlines || !!expandedRows[i]
                  return (
                    <React.Fragment key={i}>
                      <tr
                        className="transition-colors"
                        style={{
                          borderBottom: isExpanded ? 'none' : '1px solid rgba(100, 120, 200, 0.08)',
                          background: row.has_change ? 'rgba(253, 203, 110, 0.03)' : 'transparent',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(108, 92, 231, 0.03)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = row.has_change ? 'rgba(253, 203, 110, 0.03)' : 'transparent' }}
                      >
                        <td className="px-5 py-3.5 font-bold text-[var(--color-text-primary)] align-top whitespace-nowrap">
                          {renderItemText(row.topic)}
                        </td>
                        <td className="px-5 py-3.5 text-[var(--color-text-secondary)] align-top leading-relaxed max-w-xs">
                          {renderItemText(row.document_a)}
                        </td>
                        <td className="px-5 py-3.5 text-[var(--color-text-secondary)] align-top leading-relaxed max-w-xs">
                          {renderItemText(row.document_b)}
                        </td>
                        <td className="px-5 py-3.5 text-center align-top whitespace-nowrap">
                          {row.has_change ? (
                            <span className="badge badge-medium text-[10px]">Altered</span>
                          ) : (
                            <span className="badge badge-low text-[10px]">Identical</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-center align-top whitespace-nowrap">
                          <SeverityBadge severity={row.severity} />
                        </td>
                        <td className="px-5 py-3.5 text-center align-top whitespace-nowrap">
                          {row.has_change ? (
                            <button
                              onClick={() => toggleRow(i)}
                              className={`btn-ghost text-[10px] py-1 px-2.5 rounded flex items-center gap-1.5 mx-auto border transition-colors ${
                                isExpanded
                                  ? 'border-[var(--color-primary)] text-[var(--color-aurora-cyan)] bg-[var(--color-primary)]/15'
                                  : 'border-white/10 text-[var(--color-text-secondary)] hover:text-white'
                              }`}
                              title="Toggle word-level redline diff"
                            >
                              {isExpanded ? (
                                <>
                                  <EyeOff className="w-3 h-3 text-[var(--color-aurora-cyan)]" />
                                  <span>Hide</span>
                                </>
                              ) : (
                                <>
                                  <Eye className="w-3 h-3 text-[var(--color-aurora-cyan)]" />
                                  <span>Redline</span>
                                </>
                              )}
                            </button>
                          ) : (
                            <span className="text-[10px] font-mono text-[var(--color-text-muted)]">—</span>
                          )}
                        </td>
                      </tr>

                      {/* Accordion Redline Diff View */}
                      {isExpanded && row.has_change && (
                        <tr style={{ borderBottom: '1px solid rgba(100, 120, 200, 0.12)' }}>
                          <td colSpan={6} className="px-5 py-3 bg-[rgba(10,12,26,0.6)]">
                            <RedlineDiffView
                              textA={renderItemText(row.document_a)}
                              textB={renderItemText(row.document_b)}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
