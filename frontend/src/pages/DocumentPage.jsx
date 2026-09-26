import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, ArrowLeft, BookOpen, ShieldAlert, MessageCircle, Briefcase,
  ChevronDown, Send, Loader2, Calendar, Scale, Tag, ClipboardList,
  AlertTriangle, CheckCircle, ChevronRight, Printer, Info, Sparkles,
  GitCompare, HelpCircle, Copy, Check, Download, RotateCcw, PenTool,
  FileDown, Search
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import {
  getDocument, getDocumentSummary, getFullAnalysis, getLawyerPrep,
  explainClause, getDownloadUrl, getRawText, rewriteClause, getLawyerPrepExportUrl
} from '../services/documents'
import { askQuestion, getChatHistory, clearChatHistory } from '../services/chat'
import SeverityBadge from '../components/ui/SeverityBadge'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

/* ─── Helpers ──────────────────────────────────────── */
function renderItemText(item) {
  if (item === null || item === undefined) return ''
  if (typeof item === 'string') return item
  if (typeof item === 'number' || typeof item === 'boolean') return String(item)
  if (typeof item === 'object') {
    return item.text || item.description || item.clause || item.point ||
           item.topic || item.change || item.name || JSON.stringify(item)
  }
  return String(item)
}

const TABS = [
  { key: 'summary',  label: 'Summary',          icon: BookOpen     },
  { key: 'analysis', label: 'Deep Analysis',     icon: ShieldAlert  },
  { key: 'explainer',label: 'Clause Simplifier', icon: Sparkles     },
  { key: 'chat',     label: 'Q&A Chat',          icon: MessageCircle},
  { key: 'lawyer',   label: 'Lawyer Prep',       icon: Briefcase    },
  { key: 'raw',      label: 'Document Text',     icon: FileText     },
]

/* ══════════════════════════════════════════════════════
   ROOT PAGE COMPONENT
══════════════════════════════════════════════════════ */
export default function DocumentPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'summary')
  const [docInfo, setDocInfo]     = useState(null)
  const [loading, setLoading]     = useState(true)
  const [selectedClause, setSelectedClause] = useState('')

  useEffect(() => { loadDocument() }, [id])

  async function loadDocument() {
    try {
      setLoading(true)
      setDocInfo(await getDocument(id))
    } catch (err) {
      toast.error(err.message || 'Failed to load document info')
    } finally {
      setLoading(false)
    }
  }

  function handleTriggerExplainer(clauseText) {
    setSelectedClause(clauseText)
    setActiveTab('explainer')
  }

  if (loading) return <LoadingSpinner text="Analyzing document workspace..." />
  if (!docInfo) return (
    <div className="section-panel text-center py-20">
      <p style={{ color: 'var(--th-text-muted)' }}>Document not found or removed.</p>
      <Link to="/" className="btn-primary mt-5 inline-flex">Back to Dashboard</Link>
    </div>
  )

  const meta = docInfo.metadata || {}

  return (
    <div className="space-y-7">

      {/* ── Document Header Card ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card overflow-hidden"
      >
        {/* Breadcrumb bar */}
        <div
          className="px-6 py-3.5 flex items-center justify-between flex-wrap gap-3"
          style={{
            borderBottom: '1px solid var(--th-border-subtle)',
            background: 'var(--th-overlay-mild)',
          }}
        >
          <Link
            to="/"
            className="btn-ghost text-xs -ml-2 flex items-center gap-1.5"
            style={{ color: 'var(--th-text-muted)' }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Workspace
          </Link>
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={getDownloadUrl(id)}
              download
              className="btn-ghost text-xs flex items-center gap-1.5"
              style={{ color: 'var(--color-aurora-cyan)' }}
              title="Download original file"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </a>
            <Link to="/compare" className="btn-ghost text-xs flex items-center gap-1.5">
              <GitCompare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Compare</span>
            </Link>
            <button
              onClick={() => window.print()}
              className="btn-ghost text-xs no-print flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>
          </div>
        </div>

        {/* Doc identity */}
        <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4 min-w-0">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, rgba(108,92,231,0.15), rgba(0,206,201,0.1))',
                border: '1px solid rgba(108,92,231,0.25)',
                color: 'var(--color-aurora-purple)',
                boxShadow: '0 0 16px rgba(108,92,231,0.1)',
              }}
            >
              <FileText className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1
                className="text-xl font-extrabold truncate"
                style={{ color: 'var(--th-text-primary)' }}
                title={docInfo.filename}
              >
                {docInfo.filename}
              </h1>
              <div
                className="flex flex-wrap items-center gap-2.5 mt-2 text-xs font-mono"
                style={{ color: 'var(--th-text-muted)' }}
              >
                <span
                  className="uppercase font-bold"
                  style={{ color: 'var(--color-aurora-purple)' }}
                >
                  {docInfo.file_type}
                </span>
                <span style={{ opacity: 0.3 }}>&bull;</span>
                <span>{docInfo.page_count} pages</span>
                {meta.document_type && (
                  <>
                    <span style={{ opacity: 0.3 }}>&bull;</span>
                    <span style={{ color: 'var(--th-text-secondary)' }} className="capitalize">
                      {renderItemText(meta.document_type).replace(/_/g, ' ')}
                    </span>
                  </>
                )}
                {meta.governing_law && (
                  <>
                    <span style={{ opacity: 0.3 }}>&bull;</span>
                    <span>Law: {renderItemText(meta.governing_law)}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <span className="badge badge-low text-xs flex-shrink-0">Verified Ingestion</span>
        </div>
      </motion.div>

      {/* ── Tab Navigation ── */}
      <div className="tab-nav">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            className={`tab-item ${activeTab === key ? 'active' : ''}`}
            onClick={() => setActiveTab(key)}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === 'summary'  && <SummaryTab   docId={id} onExplainClause={handleTriggerExplainer} />}
          {activeTab === 'analysis' && <AnalysisTab  docId={id} onExplainClause={handleTriggerExplainer} />}
          {activeTab === 'explainer'&& <ClauseExplainerTab docId={id} initialClause={selectedClause} />}
          {activeTab === 'chat'     && <ChatTab      docId={id} />}
          {activeTab === 'lawyer'   && <LawyerPrepTab docId={id} />}
          {activeTab === 'raw'      && <RawTextTab   docId={id} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}


/* ══════════════════════════════════════════════════════
   TAB 1 — SUMMARY
══════════════════════════════════════════════════════ */
function SummaryTab({ docId, onExplainClause }) {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try   { setData(await getDocumentSummary(docId)) }
      catch { toast.error('Failed to load summary') }
      finally { setLoading(false) }
    })()
  }, [docId])

  if (loading) return <LoadingSpinner text="Generating executive summary..." />
  if (!data)   return <p style={{ color: 'var(--th-text-muted)' }}>No summary data available.</p>

  const meta = data.metadata || {}
  const partiesText = Array.isArray(meta.parties)
    ? meta.parties.map(renderItemText).join(', ')
    : renderItemText(meta.parties)

  const metaFields = [
    { label: 'Category',          value: renderItemText(meta.document_type)?.replace(/_/g, ' '), icon: Tag         },
    { label: 'Parties',           value: partiesText || '-',                                      icon: Scale       },
    { label: 'Effective Date',    value: renderItemText(meta.effective_date) || '-',              icon: Calendar    },
    { label: 'Term Duration',     value: renderItemText(meta.duration) || '-',                    icon: Calendar    },
    { label: 'Jurisdiction',      value: renderItemText(meta.governing_law) || '-',               icon: Scale       },
    { label: 'Clauses Identified',value: meta.total_clauses ? `${meta.total_clauses} clauses` : 'Standard', icon: ClipboardList },
  ]

  return (
    <div className="page-stack">

      {/* Metadata matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {metaFields.map(({ label, value, icon: Icon }) => (
          <div key={label} className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--color-aurora-purple)' }} />
              <span
                className="text-[11px] font-mono font-bold uppercase tracking-wider truncate"
                style={{ color: 'var(--th-text-muted)' }}
              >
                {label}
              </span>
            </div>
            <p
              className="text-xs font-bold truncate"
              style={{ color: 'var(--th-text-primary)' }}
              title={value}
            >
              {value || '-'}
            </p>
          </div>
        ))}
      </div>

      {/* Executive Summary */}
      <div className="card">
        <div className="panel-header-strip">
          <div
            className="flex items-center gap-2.5 text-xs font-mono font-bold uppercase tracking-wider"
            style={{ color: 'var(--th-text-primary)' }}
          >
            <BookOpen className="w-4 h-4" style={{ color: 'var(--color-aurora-purple)' }} />
            Executive Summary
          </div>
          <span className="text-xs" style={{ color: 'var(--th-text-muted)' }}>AI Synthesized</span>
        </div>
        <div className="p-6">
          <p className="text-sm leading-relaxed" style={{ color: 'var(--th-text-secondary)' }}>
            {renderItemText(data.summary)}
          </p>
        </div>
      </div>

      {/* Key Points */}
      {data.key_points?.length > 0 && (
        <div className="card">
          <div className="panel-header-strip">
            <div
              className="flex items-center gap-2.5 text-xs font-mono font-bold uppercase tracking-wider"
              style={{ color: 'var(--th-text-primary)' }}
            >
              <CheckCircle className="w-4 h-4" style={{ color: 'var(--color-aurora-green)' }} />
              Core Takeaways &amp; Commitments
            </div>
            <span
              className="text-xs font-mono"
              style={{ color: 'var(--th-text-muted)' }}
            >
              {data.key_points.length} Items
            </span>
          </div>
          <div className="p-6">
            <ul className="space-y-3">
              {data.key_points.map((point, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-xs"
                  style={{ color: 'var(--th-text-secondary)' }}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                    style={{
                      background: 'linear-gradient(135deg, var(--color-aurora-purple), var(--color-aurora-teal))',
                      boxShadow: '0 0 6px rgba(108,92,231,0.3)',
                    }}
                  />
                  <span className="leading-relaxed">{renderItemText(point)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* High-Attention Clauses */}
      {data.important_clauses?.length > 0 && (
        <div className="card">
          <div className="panel-header-strip">
            <div
              className="flex items-center gap-2.5 text-xs font-mono font-bold uppercase tracking-wider"
              style={{ color: 'var(--color-warning)' }}
            >
              <AlertTriangle className="w-4 h-4" />
              High-Attention Clauses
            </div>
            <span className="text-xs" style={{ color: 'var(--th-text-muted)' }}>
              Requires Careful Review
            </span>
          </div>
          <div className="p-6 space-y-3.5">
            {data.important_clauses.map((clause, i) => {
              const clauseStr = renderItemText(clause)
              return (
                <div
                  key={i}
                  className="p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  style={{
                    background: 'var(--th-overlay-mild)',
                    border: '1px solid var(--th-border-subtle)',
                  }}
                >
                  <div
                    className="flex items-start gap-3 text-xs"
                    style={{ color: 'var(--th-text-secondary)' }}
                  >
                    <span
                      className="font-mono font-bold flex-shrink-0"
                      style={{ color: 'var(--color-gold)' }}
                    >
                      {String(i + 1).padStart(2, '0')}.
                    </span>
                    <span className="leading-relaxed">{clauseStr}</span>
                  </div>
                  <button
                    onClick={() => onExplainClause(clauseStr)}
                    className="btn-secondary text-[11px] py-1.5 px-3 whitespace-nowrap self-end sm:self-center flex items-center gap-1.5"
                    title="Translate this clause into plain English"
                  >
                    <Sparkles className="w-3 h-3" style={{ color: 'var(--color-gold)' }} />
                    Simplify
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div
        className="p-4 rounded-lg flex items-start gap-3 text-xs"
        style={{
          border: '1px solid var(--th-border-subtle)',
          background: 'var(--th-overlay-faint)',
          color: 'var(--th-text-muted)',
        }}
      >
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-aurora-purple)' }} />
        <p>{renderItemText(data.disclaimer)}</p>
      </div>
    </div>
  )
}


/* ══════════════════════════════════════════════════════
   TAB 2 — DEEP ANALYSIS
══════════════════════════════════════════════════════ */
function AnalysisTab({ docId, onExplainClause }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [section, setSection] = useState('risks')

  useEffect(() => {
    (async () => {
      try   { setData(await getFullAnalysis(docId)) }
      catch { toast.error('Failed to load deep analysis') }
      finally { setLoading(false) }
    })()
  }, [docId])

  if (loading) return <LoadingSpinner text="Executing deep legal clause analysis..." />
  if (!data)   return <p style={{ color: 'var(--th-text-muted)' }}>Analysis unavailable.</p>

  const sections = [
    { key: 'risks',       label: 'Potential Risks',       count: data.risks?.length || 0,        icon: ShieldAlert,   color: 'var(--color-danger)'         },
    { key: 'obligations', label: 'Obligations & Rights',  count: data.obligations?.length || 0,  icon: ClipboardList, color: 'var(--color-gold)'           },
    { key: 'dates',       label: 'Milestones & Deadlines',count: data.dates?.length || 0,        icon: Calendar,      color: 'var(--color-info)'           },
    { key: 'terms',       label: 'Defined Legal Terms',   count: data.legal_terms?.length || 0,  icon: Tag,           color: 'var(--color-aurora-purple)'  },
    { key: 'actions',     label: 'Action Items',          count: data.action_items?.length || 0, icon: CheckCircle,   color: 'var(--color-aurora-green)'   },
  ]

  return (
    <div className="space-y-6">

      {/* Category pills */}
      <div className="section-panel py-3 px-4 flex flex-wrap gap-2.5">
        {sections.map(({ key, label, count, icon: Icon, color }) => (
          <button
            key={key}
            onClick={() => setSection(key)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all"
            style={
              section === key
                ? {
                    background: 'linear-gradient(135deg, rgba(108,92,231,0.15), rgba(0,206,201,0.08))',
                    border: '1px solid rgba(108,92,231,0.25)',
                    color: 'var(--th-text-primary)',
                  }
                : {
                    color: 'var(--th-text-muted)',
                    border: '1px solid transparent',
                  }
            }
          >
            <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
            {label}
            <span
              className="font-mono text-[10px] px-1.5 py-0.5 rounded-md"
              style={{
                background: 'var(--th-overlay-dark)',
                border: '1px solid var(--th-border-subtle)',
              }}
            >
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Risks */}
      {section === 'risks' && (
        <div className="space-y-4">
          {(data.risks || []).map((risk, i) => (
            <div key={i} className="card p-5 space-y-3">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <span
                    className="font-mono text-xs font-bold"
                    style={{ color: 'var(--color-danger)' }}
                  >
                    RISK-{i + 1}
                  </span>
                  <h4
                    className="text-sm font-bold"
                    style={{ color: 'var(--th-text-primary)' }}
                  >
                    {renderItemText(risk.title)}
                  </h4>
                </div>
                <SeverityBadge severity={risk.severity} />
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--th-text-secondary)' }}>
                {renderItemText(risk.description)}
              </p>
              <div
                className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 text-xs"
                style={{ borderTop: '1px solid var(--th-border-subtle)' }}
              >
                {risk.clause_reference && (
                  <div className="quote-box py-2 px-3 font-mono text-[11px]">
                    <span className="font-bold" style={{ color: 'var(--th-text-muted)' }}>Clause: </span>
                    {renderItemText(risk.clause_reference)}
                  </div>
                )}
                {risk.what_to_check && (
                  <div className="quote-box quote-box-gold py-2 px-3 text-[11px]">
                    <span className="font-bold" style={{ color: 'var(--color-gold)' }}>Audit: </span>
                    {renderItemText(risk.what_to_check)}
                  </div>
                )}
              </div>
              {risk.question_for_lawyer && (
                <div
                  className="p-3 rounded-lg text-xs flex items-start gap-2.5"
                  style={{
                    background: 'rgba(116,185,255,0.05)',
                    border: '1px solid rgba(116,185,255,0.15)',
                    color: 'var(--color-info)',
                  }}
                >
                  <HelpCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Ask your counsel: </strong>
                    {renderItemText(risk.question_for_lawyer)}
                  </span>
                </div>
              )}
            </div>
          ))}
          {(!data.risks || data.risks.length === 0) && (
            <p className="text-xs text-center py-12" style={{ color: 'var(--th-text-muted)' }}>
              No specific risk alerts detected.
            </p>
          )}
        </div>
      )}

      {/* Obligations */}
      {section === 'obligations' && (
        <div className="space-y-4">
          {(data.obligations || []).map((ob, i) => (
            <div key={i} className="card p-5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <span className={`badge ${
                    ob.type === 'right' ? 'badge-low' :
                    ob.type === 'restriction' ? 'badge-high' : 'badge-medium'
                  }`}>
                    {renderItemText(ob.type)}
                  </span>
                  <span className="text-xs font-mono font-bold" style={{ color: 'var(--th-text-muted)' }}>
                    Party: {renderItemText(ob.party) || 'Signatory'}
                  </span>
                </div>
                {ob.deadline && (
                  <span className="text-xs font-mono" style={{ color: 'var(--color-info)' }}>
                    Deadline: {renderItemText(ob.deadline)}
                  </span>
                )}
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--th-text-secondary)' }}>
                {renderItemText(ob.description)}
              </p>
              {ob.clause_reference && (
                <p className="text-[11px] font-mono" style={{ color: 'var(--th-text-muted)' }}>
                  Source: {renderItemText(ob.clause_reference)}
                </p>
              )}
            </div>
          ))}
          {(!data.obligations || data.obligations.length === 0) && (
            <p className="text-xs text-center py-12" style={{ color: 'var(--th-text-muted)' }}>
              No contractual obligations extracted.
            </p>
          )}
        </div>
      )}

      {/* Dates */}
      {section === 'dates' && (
        <div className="space-y-4">
          {(data.dates || []).map((d, i) => (
            <div key={i} className="card p-5 flex items-start gap-4">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'rgba(116,185,255,0.08)',
                  border: '1px solid rgba(116,185,255,0.15)',
                  color: 'var(--color-info)',
                }}
              >
                <Calendar className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <h4 className="text-xs font-bold" style={{ color: 'var(--th-text-primary)' }}>
                    {renderItemText(d.event)}
                  </h4>
                  {d.recurring && <span className="badge badge-info text-[10px]">Recurring</span>}
                </div>
                <p
                  className="text-xs font-mono mt-1.5"
                  style={{ color: 'var(--color-aurora-purple)' }}
                >
                  {renderItemText(d.date) || 'Date specified in execution'}
                </p>
                {d.clause_reference && (
                  <p className="text-[11px] mt-1.5" style={{ color: 'var(--th-text-muted)' }}>
                    Ref: {renderItemText(d.clause_reference)}
                  </p>
                )}
              </div>
            </div>
          ))}
          {(!data.dates || data.dates.length === 0) && (
            <p className="text-xs text-center py-12" style={{ color: 'var(--th-text-muted)' }}>
              No calendar milestones found.
            </p>
          )}
        </div>
      )}

      {/* Legal Terms */}
      {section === 'terms' && (
        <div className="space-y-4">
          {(data.legal_terms || []).map((t, i) => (
            <div key={i} className="card p-5 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4
                  className="text-xs font-mono font-bold"
                  style={{ color: 'var(--color-aurora-purple)' }}
                >
                  &ldquo;{renderItemText(t.term)}&rdquo;
                </h4>
                {t.defined_in && (
                  <span className="text-[11px] font-mono" style={{ color: 'var(--th-text-muted)' }}>
                    {renderItemText(t.defined_in)}
                  </span>
                )}
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--th-text-secondary)' }}>
                {renderItemText(t.definition)}
              </p>
              {t.used_in?.length > 0 && (
                <div
                  className="pt-2 flex flex-wrap gap-1.5 text-[10px] font-mono"
                  style={{ color: 'var(--th-text-muted)' }}
                >
                  <span>Occurrences:</span>
                  {t.used_in.map((u, ui) => (
                    <span
                      key={ui}
                      className="px-2 py-0.5 rounded-md"
                      style={{
                        background: 'rgba(108,92,231,0.06)',
                        border: '1px solid rgba(108,92,231,0.12)',
                      }}
                    >
                      {renderItemText(u)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {(!data.legal_terms || data.legal_terms.length === 0) && (
            <p className="text-xs text-center py-12" style={{ color: 'var(--th-text-muted)' }}>
              No formal definitions cataloged.
            </p>
          )}
        </div>
      )}

      {/* Action Items */}
      {section === 'actions' && (
        <div className="space-y-3">
          {(data.action_items || []).map((item, i) => (
            <div key={i} className="card p-4 flex items-start gap-3.5">
              <CheckCircle
                className="w-4 h-4 flex-shrink-0 mt-0.5"
                style={{ color: 'var(--color-aurora-green)' }}
              />
              <p className="text-xs leading-relaxed" style={{ color: 'var(--th-text-secondary)' }}>
                {renderItemText(item)}
              </p>
            </div>
          ))}
          {(!data.action_items || data.action_items.length === 0) && (
            <p className="text-xs text-center py-12" style={{ color: 'var(--th-text-muted)' }}>
              No pending action items.
            </p>
          )}
        </div>
      )}
    </div>
  )
}


/* ══════════════════════════════════════════════════════
   TAB 3 — CLAUSE EXPLAINER
══════════════════════════════════════════════════════ */
function ClauseExplainerTab({ docId, initialClause }) {
  const [clauseInput, setClauseInput] = useState(initialClause || '')
  const [loading, setLoading]         = useState(false)
  const [explanation, setExplanation] = useState(null)
  const [copied, setCopied]           = useState(false)
  const [rewriteStance, setRewriteStance] = useState('neutral_mutual')
  const [customNote, setCustomNote]   = useState('')
  const [rewriting, setRewriting]     = useState(false)
  const [rewriteResult, setRewriteResult] = useState(null)
  const [copiedRewrite, setCopiedRewrite] = useState(false)

  useEffect(() => {
    if (initialClause) { setClauseInput(initialClause); handleExplain(initialClause) }
  }, [initialClause])

  async function handleExplain(text) {
    const t = (text || clauseInput).trim()
    if (!t) { toast.error('Please enter a contract clause'); return }
    setLoading(true)
    try   { setExplanation(await explainClause(docId, t)) }
    catch (err) { toast.error(err.message || 'Failed to simplify clause') }
    finally { setLoading(false) }
  }

  async function handleRewrite() {
    const text = (explanation?.original_text || clauseInput).trim()
    if (!text) { toast.error('Please enter a clause first'); return }
    setRewriting(true)
    try {
      setRewriteResult(await rewriteClause(docId, text, rewriteStance, customNote))
      toast.success('Counter-proposal drafted!')
    } catch (err) {
      toast.error(err.message || 'Failed to draft counter-proposal')
    } finally {
      setRewriting(false)
    }
  }

  function handleCopy() {
    if (!explanation) return
    navigator.clipboard.writeText(
      `CLAUSE:\n${explanation.original_text}\n\nPLAIN ENGLISH:\n${explanation.simple_explanation}\n\nELI5:\n${explanation.very_simple_explanation}`
    )
    setCopied(true); setTimeout(() => setCopied(false), 2000)
    toast.success('Explanation copied')
  }

  function handleCopyRewrite() {
    if (!rewriteResult) return
    navigator.clipboard.writeText(rewriteResult.rewritten_clause)
    setCopiedRewrite(true); setTimeout(() => setCopiedRewrite(false), 2000)
    toast.success('Counter-proposal copied')
  }

  const sampleClauses = [
    'Either party may terminate this agreement immediately upon written notice if the other party breaches any material term and fails to cure such breach within 30 days.',
    'Indemnitor shall defend, indemnify and hold harmless Indemnitee against any and all liabilities, losses, damages, claims, and expenses arising out of negligence.',
    'During the term and for a period of 24 months post-termination, Employee shall not directly or indirectly engage in any business competitive with Company.',
  ]

  return (
    <div className="space-y-7">

      {/* Input workbench */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4" style={{ color: 'var(--color-gold)' }} />
            <h3 className="text-sm font-bold" style={{ color: 'var(--th-text-primary)' }}>
              Interactive Clause Simplifier
            </h3>
          </div>
          <span className="text-xs font-mono" style={{ color: 'var(--th-text-muted)' }}>
            Multi-Tier Legal Translation
          </span>
        </div>

        <p className="text-xs leading-relaxed" style={{ color: 'var(--th-text-muted)' }}>
          Paste any complex legalese, indemnification clause, non-compete covenant, or dispute
          provision to unpack what it actually means in plain English.
        </p>

        <div className="space-y-3">
          <textarea
            rows={4}
            value={clauseInput}
            onChange={(e) => setClauseInput(e.target.value)}
            placeholder="Paste contract clause text here..."
            className="input font-sans text-xs leading-relaxed resize-y"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div
              className="flex flex-wrap items-center gap-2 text-[11px]"
              style={{ color: 'var(--th-text-muted)' }}
            >
              <span>Quick Samples:</span>
              {sampleClauses.map((sc, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { setClauseInput(sc); handleExplain(sc) }}
                  className="px-2.5 py-1 rounded-md transition-colors"
                  style={{
                    background: 'rgba(108,92,231,0.06)',
                    border: '1px solid rgba(108,92,231,0.12)',
                    color: 'var(--color-aurora-purple)',
                  }}
                >
                  Sample {i + 1}
                </button>
              ))}
            </div>
            <button
              onClick={() => handleExplain()}
              disabled={loading || !clauseInput.trim()}
              className="btn-primary text-xs py-2.5 px-5 flex items-center gap-2"
            >
              {loading ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Simplifying...</>
              ) : (
                <><Sparkles className="w-3.5 h-3.5" /> Translate to Plain English</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {explanation && (
        <div className="space-y-5">
          {/* Classification strip */}
          <div className="section-panel py-3 px-5 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5 text-xs">
              <span className="font-mono font-bold" style={{ color: 'var(--th-text-muted)' }}>
                Clause Type:
              </span>
              <span className="badge badge-gold">
                {renderItemText(explanation.clause_type) || 'General Covenant'}
              </span>
            </div>
            <button onClick={handleCopy} className="btn-secondary text-[11px] py-1.5 px-3 flex items-center gap-1.5">
              {copied
                ? <><Check className="w-3 h-3" style={{ color: 'var(--color-aurora-green)' }} /> Copied</>
                : <><Copy className="w-3 h-3" /> Copy Breakdown</>}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Tier 1 */}
            <div
              className="card p-6 space-y-2.5"
              style={{ borderLeft: '4px solid var(--color-aurora-violet)' }}
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span
                  className="text-[11px] font-mono font-bold uppercase tracking-wider"
                  style={{ color: 'var(--color-aurora-purple)' }}
                >
                  Tier 1 &bull; Plain English
                </span>
                <span className="text-[10px] font-mono" style={{ color: 'var(--th-text-muted)' }}>
                  Business Readable
                </span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--th-text-primary)' }}>
                {renderItemText(explanation.simple_explanation)}
              </p>
            </div>
            {/* Tier 2 */}
            <div
              className="card p-6 space-y-2.5"
              style={{ borderLeft: '4px solid var(--color-aurora-green)' }}
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span
                  className="text-[11px] font-mono font-bold uppercase tracking-wider"
                  style={{ color: 'var(--color-aurora-green)' }}
                >
                  Tier 2 &bull; 5th Grade Level
                </span>
                <span className="text-[10px] font-mono" style={{ color: 'var(--th-text-muted)' }}>
                  Zero Jargon
                </span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--th-text-secondary)' }}>
                {renderItemText(explanation.very_simple_explanation)}
              </p>
            </div>
          </div>

          {/* Concerns & Questions */}
          <div className="card p-6 space-y-4">
            <h4
              className="text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2.5"
              style={{ color: 'var(--color-gold)' }}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Strategic Concerns &amp; Questions
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {explanation.potential_concern && (
                <div
                  className="p-4 rounded-lg"
                  style={{
                    background: 'rgba(253,203,110,0.04)',
                    border: '1px solid rgba(253,203,110,0.12)',
                  }}
                >
                  <span
                    className="font-bold block mb-1.5"
                    style={{ color: 'var(--color-warning)' }}
                  >
                    Potential Exposure:
                  </span>
                  <p style={{ color: 'var(--th-text-secondary)' }}>
                    {renderItemText(explanation.potential_concern)}
                  </p>
                </div>
              )}
              {explanation.question_for_lawyer && (
                <div
                  className="p-4 rounded-lg"
                  style={{
                    background: 'rgba(116,185,255,0.04)',
                    border: '1px solid rgba(116,185,255,0.12)',
                  }}
                >
                  <span
                    className="font-bold block mb-1.5"
                    style={{ color: 'var(--color-info)' }}
                  >
                    Recommended Inquiry:
                  </span>
                  <p style={{ color: 'var(--th-text-secondary)' }}>
                    {renderItemText(explanation.question_for_lawyer)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Counter-Proposal Drafter */}
          <div
            className="card p-6 space-y-5"
            style={{ border: '1px solid rgba(108,92,231,0.25)' }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4
                  className="text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2"
                  style={{ color: 'var(--color-aurora-purple)' }}
                >
                  <PenTool className="w-4 h-4" />
                  AI Counter-Proposal Drafter
                </h4>
                <p className="text-xs mt-0.5" style={{ color: 'var(--th-text-muted)' }}>
                  Generate a balanced or favorable replacement clause for negotiation.
                </p>
              </div>
            </div>

            {/* Stance buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-mono" style={{ color: 'var(--th-text-muted)' }}>
                Target Stance:
              </span>
              {[
                { id: 'neutral_mutual',   label: 'Mutual & Balanced'       },
                { id: 'vendor_favorable', label: 'Vendor Favorable'        },
                { id: 'buyer_favorable',  label: 'Buyer / Client Favorable' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setRewriteStance(id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={
                    rewriteStance === id
                      ? {
                          background: 'linear-gradient(135deg, var(--color-aurora-violet), #8b5cf6)',
                          color: '#ffffff',
                          border: '1px solid rgba(162,155,254,0.3)',
                          boxShadow: '0 2px 8px rgba(108,92,231,0.25)',
                        }
                      : {
                          background: 'var(--th-overlay-dark)',
                          color: 'var(--th-text-muted)',
                          border: '1px solid var(--th-border-subtle)',
                        }
                  }
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex gap-3 flex-wrap sm:flex-nowrap">
              <input
                type="text"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="Optional instruction (e.g. 'Add a 30-day cure period')..."
                className="input flex-1 text-xs min-w-0"
              />
              <button
                type="button"
                onClick={handleRewrite}
                disabled={rewriting}
                className="btn-primary text-xs px-4 flex items-center gap-2 flex-shrink-0"
              >
                {rewriting
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Drafting...</>
                  : <><Sparkles className="w-3.5 h-3.5" /> Draft Counter-Proposal</>}
              </button>
            </div>

            {rewriteResult && (
              <div
                className="p-5 rounded-xl space-y-4"
                style={{
                  background: 'var(--th-overlay-dark)',
                  border: '1px solid rgba(0,206,201,0.2)',
                }}
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span
                    className="text-[11px] font-mono font-bold uppercase tracking-wider"
                    style={{ color: 'var(--color-aurora-cyan)' }}
                  >
                    Proposed Alternative Clause:
                  </span>
                  <button
                    onClick={handleCopyRewrite}
                    className="btn-ghost text-xs flex items-center gap-1.5"
                  >
                    {copiedRewrite
                      ? <><Check className="w-3.5 h-3.5" style={{ color: 'var(--color-aurora-green)' }} /> Copied</>
                      : <><Copy className="w-3.5 h-3.5" /> Copy Clause</>}
                  </button>
                </div>
                <div
                  className="p-4 rounded-lg text-xs leading-relaxed font-mono font-medium"
                  style={{
                    background: 'rgba(0,206,201,0.05)',
                    border: '1px solid rgba(0,206,201,0.15)',
                    color: 'var(--th-text-primary)',
                  }}
                >
                  {rewriteResult.rewritten_clause}
                </div>
                {rewriteResult.key_changes?.length > 0 && (
                  <div className="space-y-1.5">
                    <span
                      className="text-[11px] font-mono font-bold uppercase"
                      style={{ color: 'var(--th-text-muted)' }}
                    >
                      Strategic Amendments:
                    </span>
                    <ul
                      className="list-disc list-inside text-xs space-y-1"
                      style={{ color: 'var(--th-text-secondary)' }}
                    >
                      {rewriteResult.key_changes.map((change, ci) => (
                        <li key={ci}>{renderItemText(change)}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {rewriteResult.negotiation_rationale && (
                  <p className="text-xs" style={{ color: 'var(--color-info)' }}>
                    <strong>Rationale: </strong>
                    {renderItemText(rewriteResult.negotiation_rationale)}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}


/* ══════════════════════════════════════════════════════
   TAB 4 — Q&A CHAT
══════════════════════════════════════════════════════ */
function ChatTab({ docId }) {
  const [messages, setMessages]     = useState([])
  const [input, setInput]           = useState('')
  const [sending, setSending]       = useState(false)
  const [simplicity, setSimplicity] = useState('simple')
  const [sessionId, setSessionId]   = useState(null)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const chatEndRef = useRef(null)

  useEffect(() => { loadHistory() }, [docId])
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function loadHistory() {
    try {
      setLoadingHistory(true)
      const data = await getChatHistory(docId)
      if (data?.session_id) setSessionId(data.session_id)
      if (data?.messages?.length > 0) {
        setMessages(data.messages.map((m) => ({
          role: m.role === 'assistant' ? 'ai' : m.role,
          text: renderItemText(m.text),
          sources: m.sources || [],
          confidence: m.confidence,
        })))
      }
    } catch (err) {
      console.warn('Could not load chat history:', err)
    } finally {
      setLoadingHistory(false)
    }
  }

  async function handleClearHistory() {
    if (!window.confirm('Clear all conversation messages for this contract?')) return
    try {
      await clearChatHistory(docId)
      setMessages([])
      toast.success('Chat conversation cleared')
    } catch { toast.error('Failed to clear conversation') }
  }

  async function handleSend(e) {
    e?.preventDefault()
    const q = input.trim()
    if (!q || sending) return
    setMessages((prev) => [...prev, { role: 'user', text: q }])
    setInput('')
    setSending(true)
    try {
      const result = await askQuestion(docId, q, simplicity, sessionId)
      if (result.session_id) setSessionId(result.session_id)
      setMessages((prev) => [...prev, {
        role: 'ai',
        text: renderItemText(result.answer),
        sources: result.sources || [],
        confidence: result.confidence,
      }])
    } catch (err) {
      setMessages((prev) => [...prev, {
        role: 'ai', text: `Inquiry failed: ${err.message}`, error: true
      }])
    } finally {
      setSending(false)
    }
  }

  const promptSuggestions = [
    'What are the primary termination triggers?',
    'Is financial liability capped for damages?',
    'What are my mandatory notice periods?',
    'Are there post-termination non-compete clauses?',
  ]

  return (
    <div
      className="section-panel flex flex-col p-5"
      style={{ minHeight: '65vh' }}
    >
      {/* Controls */}
      <div
        className="mb-5 pb-4 flex flex-wrap items-center justify-between gap-4"
        style={{ borderBottom: '1px solid var(--th-border-subtle)' }}
      >
        <div className="flex items-center gap-2.5 text-xs flex-wrap">
          <span className="font-mono" style={{ color: 'var(--th-text-muted)' }}>Response:</span>
          {['original', 'simple', 'very_simple'].map((level) => (
            <button
              key={level}
              onClick={() => setSimplicity(level)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={
                simplicity === level
                  ? {
                      background: 'linear-gradient(135deg, var(--color-aurora-violet), #8b5cf6)',
                      color: '#ffffff',
                      border: '1px solid rgba(162,155,254,0.3)',
                      boxShadow: '0 2px 8px rgba(108,92,231,0.3)',
                    }
                  : {
                      background: 'var(--th-overlay-dark)',
                      color: 'var(--th-text-muted)',
                      border: '1px solid var(--th-border-subtle)',
                    }
              }
            >
              {level === 'very_simple' ? 'ELI5' : level === 'simple' ? 'Plain' : 'Legal'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {messages.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="btn-ghost text-xs flex items-center gap-1.5"
              style={{ color: 'var(--th-text-muted)' }}
              title="Clear messages"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          )}
          <span
            className="text-[11px] font-mono hidden sm:block"
            style={{ color: 'var(--th-text-muted)' }}
          >
            RAG Pipeline &bull; Multi-Turn Memory
          </span>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 space-y-5 mb-5 overflow-y-auto max-h-[50vh] pr-2">
        {messages.length === 0 && (
          <div className="text-center py-14 space-y-5">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto"
              style={{
                background: 'var(--th-icon-box-bg)',
                border: '1px solid var(--th-icon-box-bd)',
                color: 'var(--color-aurora-purple)',
              }}
            >
              <MessageCircle className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-sm font-bold" style={{ color: 'var(--th-text-primary)' }}>
                Ask Questions Grounded in this Document
              </h4>
              <p
                className="text-xs mt-2 max-w-md mx-auto"
                style={{ color: 'var(--th-text-muted)' }}
              >
                RAG pipeline retrieves semantic excerpts and generates citations with page numbers.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2.5 max-w-xl mx-auto pt-2">
              {promptSuggestions.map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="btn-secondary text-[11px] py-1.5 px-3"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={msg.role === 'user' ? 'chat-user' : 'chat-ai'}>
              <div className="markdown-body text-xs">
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>
              {msg.sources?.length > 0 && (
                <div
                  className="mt-3.5 pt-3 space-y-1.5"
                  style={{ borderTop: '1px solid var(--th-border-subtle)' }}
                >
                  <p
                    className="text-[11px] font-mono font-bold uppercase tracking-wider"
                    style={{ color: 'var(--th-text-muted)' }}
                  >
                    Citations:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {msg.sources.map((s, si) => (
                      <span key={si} className="quote-box py-1 px-2.5 text-[10px] font-mono">
                        {renderItemText(s.section) || 'Document'}{s.page ? ` [p.${s.page}]` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {msg.confidence && (
                <div
                  className="mt-2.5 text-[11px] font-mono flex items-center gap-2.5"
                  style={{ color: 'var(--th-text-muted)' }}
                >
                  <span>Confidence:</span>
                  <span className={`badge ${
                    msg.confidence === 'high' ? 'badge-low' :
                    msg.confidence === 'low'  ? 'badge-high' : 'badge-medium'
                  }`}>
                    {msg.confidence}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div
              className="chat-ai flex items-center gap-2.5 text-xs"
              style={{ color: 'var(--th-text-muted)' }}
            >
              <Loader2
                className="w-3.5 h-3.5 animate-spin"
                style={{ color: 'var(--color-aurora-purple)' }}
              />
              Scanning document vectors...
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input bar */}
      <form onSubmit={handleSend} className="flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask any question about clauses, risks, or conditions..."
          className="input flex-1 text-xs"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="btn-primary px-5"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  )
}


/* ══════════════════════════════════════════════════════
   TAB 5 — LAWYER PREP
══════════════════════════════════════════════════════ */
function LawyerPrepTab({ docId }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try   { setData(await getLawyerPrep(docId)) }
      catch { toast.error('Failed to generate lawyer prep report') }
      finally { setLoading(false) }
    })()
  }, [docId])

  if (loading) return <LoadingSpinner text="Compiling formal lawyer prep briefing..." />
  if (!data)   return <p style={{ color: 'var(--th-text-muted)' }}>Preparation briefing not available.</p>

  return (
    <div className="space-y-7">

      {/* Header card */}
      <div className="card p-6">
        <div
          className="flex items-center justify-between flex-wrap gap-4 pb-4"
          style={{ borderBottom: '1px solid var(--th-border-subtle)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: 'rgba(253,203,110,0.08)',
                border: '1px solid rgba(253,203,110,0.15)',
                color: 'var(--color-gold)',
              }}
            >
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold" style={{ color: 'var(--th-text-primary)' }}>
                Attorney Consultation Briefing
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--th-text-muted)' }}>
                Structured legal points and negotiation checklist
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 no-print flex-wrap">
            <a
              href={getLawyerPrepExportUrl(docId)}
              download
              className="btn-secondary text-xs flex items-center gap-1.5"
              title="Download dossier as Markdown"
            >
              <FileDown className="w-3.5 h-3.5" style={{ color: 'var(--color-aurora-cyan)' }} />
              Download Brief (.md)
            </a>
            <button
              onClick={() => window.print()}
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Brief
            </button>
          </div>
        </div>
        <div className="mt-4 text-xs" style={{ color: 'var(--th-text-secondary)' }}>
          Subject Agreement:{' '}
          <strong style={{ color: 'var(--th-text-primary)' }}>
            {renderItemText(data.document_title)}
          </strong>
        </div>
      </div>

      {/* Discussion Points */}
      {data.key_areas_to_discuss?.length > 0 && (
        <div className="card">
          <div className="panel-header-strip">
            <div
              className="flex items-center gap-2.5 text-xs font-mono font-bold uppercase tracking-wider"
              style={{ color: 'var(--color-warning)' }}
            >
              <AlertTriangle className="w-4 h-4" />
              Priority Discussion Topics
            </div>
          </div>
          <div className="p-6 space-y-5">
            {data.key_areas_to_discuss.map((area, i) => (
              <div
                key={i}
                className="pl-4 space-y-1.5"
                style={{ borderLeft: '2px solid var(--color-gold)' }}
              >
                <h4 className="text-xs font-bold" style={{ color: 'var(--th-text-primary)' }}>
                  {renderItemText(area.topic)}
                </h4>
                {area.clause_reference && (
                  <p className="text-[11px] font-mono" style={{ color: 'var(--th-text-muted)' }}>
                    Clause: {renderItemText(area.clause_reference)}
                  </p>
                )}
                <p className="text-xs leading-relaxed" style={{ color: 'var(--th-text-secondary)' }}>
                  {renderItemText(area.why_discuss)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Questions */}
      {data.questions_to_ask?.length > 0 && (
        <div className="card">
          <div className="panel-header-strip">
            <div
              className="flex items-center gap-2.5 text-xs font-mono font-bold uppercase tracking-wider"
              style={{ color: 'var(--color-info)' }}
            >
              <MessageCircle className="w-4 h-4" />
              Targeted Questions for Your Lawyer
            </div>
          </div>
          <div className="p-6 space-y-3">
            {data.questions_to_ask.map((q, i) => (
              <div
                key={i}
                className="flex items-start gap-3 text-xs"
                style={{ color: 'var(--th-text-secondary)' }}
              >
                <span
                  className="font-mono font-bold flex-shrink-0"
                  style={{ color: 'var(--color-info)' }}
                >
                  Q{i + 1}.
                </span>
                <span className="leading-relaxed">{renderItemText(q)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documents to Bring */}
      {data.documents_to_bring?.length > 0 && (
        <div className="card">
          <div className="panel-header-strip">
            <div
              className="flex items-center gap-2.5 text-xs font-mono font-bold uppercase tracking-wider"
              style={{ color: 'var(--color-aurora-purple)' }}
            >
              <FileText className="w-4 h-4" />
              Documentation Checklist
            </div>
          </div>
          <div className="p-6 space-y-3">
            {data.documents_to_bring.map((doc, i) => (
              <div
                key={i}
                className="flex items-center gap-3 text-xs"
                style={{ color: 'var(--th-text-secondary)' }}
              >
                <CheckCircle
                  className="w-3.5 h-3.5 flex-shrink-0"
                  style={{ color: 'var(--color-aurora-purple)' }}
                />
                <span>{renderItemText(doc)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Checklist */}
      {data.action_checklist?.length > 0 && (
        <div className="card">
          <div className="panel-header-strip">
            <div
              className="flex items-center gap-2.5 text-xs font-mono font-bold uppercase tracking-wider"
              style={{ color: 'var(--color-aurora-green)' }}
            >
              <ClipboardList className="w-4 h-4" />
              Pre-Consultation Action Items
            </div>
          </div>
          <div className="p-6 space-y-3">
            {data.action_checklist.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 text-xs"
                style={{ color: 'var(--th-text-secondary)' }}
              >
                <input
                  type="checkbox"
                  className="rounded cursor-pointer"
                  style={{ accentColor: 'var(--color-aurora-violet)' }}
                />
                <span>{renderItemText(item)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


/* ══════════════════════════════════════════════════════
   TAB 6 — RAW DOCUMENT TEXT
══════════════════════════════════════════════════════ */
function RawTextTab({ docId }) {
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [copied, setCopied]     = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    setLoading(true)
    getRawText(docId)
      .then(setData)
      .catch((err) => {
        console.error(err)
        toast.error('Failed to fetch extracted document text')
      })
      .finally(() => setLoading(false))
  }, [docId])

  function handleCopy() {
    if (!data?.raw_text) return
    navigator.clipboard.writeText(data.raw_text)
    setCopied(true)
    toast.success('Raw text copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return (
    <div className="card p-12 flex flex-col items-center justify-center text-center">
      <Loader2
        className="w-8 h-8 animate-spin mb-3"
        style={{ color: 'var(--color-aurora-purple)' }}
      />
      <p className="text-xs" style={{ color: 'var(--th-text-secondary)' }}>
        Retrieving raw document text...
      </p>
    </div>
  )

  if (!data?.raw_text) return (
    <div className="card p-12 text-center">
      <FileText
        className="w-8 h-8 mx-auto mb-3"
        style={{ color: 'var(--th-text-muted)' }}
      />
      <p className="text-sm font-semibold" style={{ color: 'var(--th-text-primary)' }}>
        No Extracted Text Found
      </p>
      <p className="text-xs mt-1" style={{ color: 'var(--th-text-muted)' }}>
        This document may be empty or failed OCR processing.
      </p>
    </div>
  )

  const rawLines = data.raw_text.split('\n')
  const lq       = searchQuery.trim().toLowerCase()
  const lines    = rawLines.map((line, idx) => ({
    line, idx, matches: lq ? line.toLowerCase().includes(lq) : false,
  }))

  return (
    <div className="space-y-4">

      {/* Metrics & controls bar */}
      <div className="card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { val: data.word_count, label: 'Words'     },
            { val: data.char_count, label: 'Characters' },
            { val: data.chunk_count,label: 'RAG Chunks' },
          ].map(({ val, label }) => (
            <div
              key={label}
              className="badge text-[10px]"
              style={{
                background: 'var(--th-overlay-mild)',
                border: '1px solid var(--th-border-subtle)',
                color: 'var(--th-text-secondary)',
              }}
            >
              <span
                className="font-bold mr-1"
                style={{ color: 'var(--th-text-primary)' }}
              >
                {val?.toLocaleString()}
              </span>
              {label}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:w-64">
            <Search
              className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--th-text-muted)' }}
            />
            <input
              type="text"
              placeholder="Search in text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-9 pr-3 py-1.5 text-xs"
              style={{ minHeight: 'unset' }}
            />
          </div>
          {/* Copy */}
          <button
            onClick={handleCopy}
            className="btn-secondary text-xs flex items-center gap-1.5 whitespace-nowrap py-1.5 px-3 flex-shrink-0"
          >
            {copied
              ? <><Check className="w-3.5 h-3.5" style={{ color: 'var(--color-aurora-green)' }} /> Copied</>
              : <><Copy className="w-3.5 h-3.5" /> Copy All</>}
          </button>
        </div>
      </div>

      {/* Text viewer */}
      <div className="card overflow-hidden">
        <div className="panel-header-strip flex items-center justify-between">
          <div
            className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider"
            style={{ color: 'var(--th-text-secondary)' }}
          >
            <FileText className="w-3.5 h-3.5" style={{ color: 'var(--color-aurora-purple)' }} />
            Extracted Text Stream
          </div>
          <span className="text-[10px] font-mono" style={{ color: 'var(--th-text-muted)' }}>
            {lines.length} lines{searchQuery ? ' (filter active)' : ''}
          </span>
        </div>

        <div
          className="p-4 max-h-[680px] overflow-y-auto font-mono text-xs leading-relaxed select-text"
          style={{
            background: 'var(--th-raw-bg)',
            color: 'var(--th-text-secondary)',
          }}
        >
          {lines.map(({ line, idx, matches }) => (
            <div
              key={idx}
              className="flex items-start gap-3 py-0.5 px-2 rounded"
              style={
                matches
                  ? {
                      background: 'rgba(108,92,231,0.15)',
                      color: 'var(--th-text-primary)',
                      fontWeight: 600,
                    }
                  : {}
              }
            >
              <span
                className="text-[10px] select-none w-8 text-right flex-shrink-0 pt-0.5"
                style={{ color: 'var(--th-text-muted)', opacity: 0.5 }}
              >
                {idx + 1}
              </span>
              <span className="whitespace-pre-wrap break-words flex-1">
                {line || (
                  <span style={{ opacity: 0.2 }}>&para;</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
