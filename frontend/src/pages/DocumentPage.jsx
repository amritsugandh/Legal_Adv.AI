import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, ArrowLeft, BookOpen, ShieldAlert, MessageCircle, Briefcase,
  Send, Loader2, Calendar, Scale, Tag, ClipboardList,
  AlertTriangle, CheckCircle, Printer, Info, Sparkles,
  GitCompare, HelpCircle, Copy, Check, Download, RotateCcw, PenTool,
  FileDown, Search, RefreshCw
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

function renderItemText(item) {
  if (item === null || item === undefined) return ''
  if (typeof item === 'string') return item
  if (typeof item === 'number' || typeof item === 'boolean') return String(item)
  if (typeof item === 'object')
    return item.text || item.description || item.clause || item.point ||
           item.topic || item.change || item.name || JSON.stringify(item)
  return String(item)
}

const TABS = [
  { key: 'summary',   label: 'Summary',           icon: BookOpen      },
  { key: 'analysis',  label: 'Deep Analysis',      icon: ShieldAlert   },
  { key: 'explainer', label: 'Clause Simplifier',  icon: Sparkles      },
  { key: 'chat',      label: 'Q&A Chat',           icon: MessageCircle },
  { key: 'lawyer',    label: 'Lawyer Prep',        icon: Briefcase     },
  { key: 'raw',       label: 'Document Text',      icon: FileText      },
]

/* ── shared section heading used across all tabs ── */
function PanelHeader({ icon: Icon, label, iconColor, right }) {
  return (
    <div className="panel-header-strip">
      <div className="flex items-center gap-2.5">
        {Icon && <Icon className="w-4 h-4 flex-shrink-0" style={{ color: iconColor || 'var(--color-aurora-purple)' }} />}
        <span className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: 'var(--th-text-primary)' }}>
          {label}
        </span>
      </div>
      {right && <div>{right}</div>}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   DOCUMENT PAGE ROOT
   ══════════════════════════════════════════════════════════════ */
export default function DocumentPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab]         = useState(searchParams.get('tab') || 'summary')
  const [docInfo, setDocInfo]             = useState(null)
  const [loading, setLoading]             = useState(true)
  const [selectedClause, setSelectedClause] = useState('')

  useEffect(() => { loadDoc() }, [id])

  async function loadDoc() {
    try {
      setLoading(true)
      setDocInfo(await getDocument(id))
    } catch (err) {
      toast.error(err.message || 'Failed to load document')
    } finally {
      setLoading(false)
    }
  }

  function triggerExplainer(clauseText) {
    setSelectedClause(clauseText)
    setActiveTab('explainer')
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center" style={{ minHeight: '60vh' }}>
      <LoadingSpinner text="Loading document workspace…" />
    </div>
  )

  if (!docInfo) return (
    <div className="section-panel text-center" style={{ padding: '5rem 2rem' }}>
      <p className="mb-6" style={{ color: 'var(--th-text-muted)' }}>Document not found or removed.</p>
      <Link to="/" className="btn-primary">← Back to Dashboard</Link>
    </div>
  )

  const meta = docInfo.metadata || {}

  return (
    <div className="page-stack">

      {/* ══ DOCUMENT IDENTITY CARD ══════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="card overflow-hidden"
      >
        {/* ── Breadcrumb / Action bar ── */}
        <div className="doc-action-bar">
          <Link
            to="/"
            className="btn-ghost flex items-center gap-2 text-sm"
            style={{ minHeight: '36px', color: 'var(--th-text-muted)' }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Workspace</span>
          </Link>

          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={getDownloadUrl(id)}
              download
              className="btn-ghost flex items-center gap-1.5 text-sm"
              style={{ minHeight: '36px', color: 'var(--color-aurora-cyan)' }}
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </a>
            <Link
              to="/compare"
              className="btn-ghost flex items-center gap-1.5 text-sm"
              style={{ minHeight: '36px' }}
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Compare</span>
            </Link>
            <button
              onClick={() => window.print()}
              className="btn-ghost no-print flex items-center gap-1.5 text-sm"
              style={{ minHeight: '36px' }}
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>
          </div>
        </div>

        {/* ── File identity ── */}
        <div className="doc-identity-body">
          <div className="flex items-start gap-4 min-w-0 flex-1">
            {/* Icon */}
            <div
              className="doc-file-icon"
              style={{
                background: 'var(--th-icon-box-bg)',
                border: '1px solid var(--th-icon-box-bd)',
                color: 'var(--color-aurora-purple)',
              }}
            >
              <FileText className="w-6 h-6" />
            </div>

            {/* Name + meta chips */}
            <div className="min-w-0 flex-1">
              <h1
                className="doc-filename"
                title={docInfo.filename}
                style={{ color: 'var(--th-text-primary)' }}
              >
                {docInfo.filename}
              </h1>
              <div className="doc-chips">
                <span className="type-pill">{docInfo.file_type?.toUpperCase()}</span>
                <span className="doc-chip-sep">·</span>
                <span className="doc-chip-text">{docInfo.page_count} pages</span>
                {meta.document_type && (
                  <>
                    <span className="doc-chip-sep">·</span>
                    <span className="doc-chip-text capitalize">
                      {renderItemText(meta.document_type).replace(/_/g, ' ')}
                    </span>
                  </>
                )}
                {meta.governing_law && (
                  <>
                    <span className="doc-chip-sep">·</span>
                    <span className="doc-chip-text">Law: {renderItemText(meta.governing_law)}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Verified badge */}
          <span className="badge badge-low flex-shrink-0 self-start mt-1">
            ✓ Verified Ingestion
          </span>
        </div>
      </motion.div>

      {/* ══ TAB NAVIGATION ═══════════════════════════════════════ */}
      <div className="tab-nav">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            className={`tab-item ${activeTab === key ? 'active' : ''}`}
            onClick={() => setActiveTab(key)}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="tab-label">{label}</span>
          </button>
        ))}
      </div>

      {/* ══ TAB CONTENT ══════════════════════════════════════════ */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === 'summary'   && <SummaryTab    docId={id} onExplain={triggerExplainer} />}
          {activeTab === 'analysis'  && <AnalysisTab   docId={id} onExplain={triggerExplainer} />}
          {activeTab === 'explainer' && <ExplainerTab  docId={id} initialClause={selectedClause} />}
          {activeTab === 'chat'      && <ChatTab       docId={id} />}
          {activeTab === 'lawyer'    && <LawyerPrepTab docId={id} />}
          {activeTab === 'raw'       && <RawTextTab    docId={id} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   TAB 1 — SUMMARY
   ══════════════════════════════════════════════════════════════ */
function SummaryTab({ docId, onExplain }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try { setData(await getDocumentSummary(docId)) }
      catch { toast.error('Failed to load summary') }
      finally { setLoading(false) }
    })()
  }, [docId])

  if (loading) return <LoadingSpinner text="Generating executive summary…" />
  if (!data)   return <p style={{ color: 'var(--th-text-muted)' }}>No summary data.</p>

  const meta    = data.metadata || {}
  const parties = Array.isArray(meta.parties)
    ? meta.parties.map(renderItemText).join(', ')
    : renderItemText(meta.parties)

  const metaFields = [
    { label: 'Category',     value: renderItemText(meta.document_type)?.replace(/_/g, ' '), icon: Tag           },
    { label: 'Parties',      value: parties || '—',                                          icon: Scale         },
    { label: 'Eff. Date',    value: renderItemText(meta.effective_date) || '—',              icon: Calendar      },
    { label: 'Duration',     value: renderItemText(meta.duration) || '—',                    icon: Calendar      },
    { label: 'Jurisdiction', value: renderItemText(meta.governing_law) || '—',               icon: Scale         },
    { label: 'Clauses',      value: meta.total_clauses ? `${meta.total_clauses}` : 'Standard', icon: ClipboardList },
  ]

  return (
    <div className="page-stack">

      {/* ── Metadata grid ── */}
      <div className="meta-grid">
        {metaFields.map(({ label, value, icon: Icon }) => (
          <div key={label} className="card meta-cell">
            <div className="meta-cell-header">
              <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--color-aurora-purple)' }} />
              <span className="meta-cell-label">{label}</span>
            </div>
            <p className="meta-cell-value" title={value}>{value || '—'}</p>
          </div>
        ))}
      </div>

      {/* ── Executive Summary ── */}
      <div className="card">
        <PanelHeader
          icon={BookOpen}
          label="Executive Summary"
          right={<span className="text-xs font-mono" style={{ color: 'var(--th-text-muted)' }}>AI Synthesized</span>}
        />
        <div className="card-body">
          <p className="body-text">{renderItemText(data.summary)}</p>
        </div>
      </div>

      {/* ── Core Takeaways ── */}
      {data.key_points?.length > 0 && (
        <div className="card">
          <PanelHeader
            icon={CheckCircle}
            iconColor="var(--color-aurora-green)"
            label="Core Takeaways"
            right={<span className="text-xs font-mono" style={{ color: 'var(--th-text-muted)' }}>{data.key_points.length} items</span>}
          />
          <div className="card-body">
            <ul className="takeaway-list">
              {data.key_points.map((pt, i) => (
                <li key={i} className="takeaway-item">
                  <span className="takeaway-dot" />
                  <span className="body-text">{renderItemText(pt)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ── High-Attention Clauses ── */}
      {data.important_clauses?.length > 0 && (
        <div className="card">
          <PanelHeader
            icon={AlertTriangle}
            iconColor="var(--color-warning)"
            label="High-Attention Clauses"
            right={<span className="text-xs" style={{ color: 'var(--th-text-muted)' }}>Requires Review</span>}
          />
          <div className="card-body space-y-3">
            {data.important_clauses.map((clause, i) => {
              const str = renderItemText(clause)
              return (
                <div
                  key={i}
                  className="clause-row"
                  style={{
                    background: 'var(--th-overlay-mild)',
                    border: '1px solid var(--th-border-subtle)',
                  }}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span
                      className="font-mono font-bold text-sm flex-shrink-0 mt-0.5"
                      style={{ color: 'var(--color-gold)' }}
                    >
                      {String(i + 1).padStart(2, '0')}.
                    </span>
                    <p className="body-text flex-1">{str}</p>
                  </div>
                  <button
                    onClick={() => onExplain(str)}
                    className="btn-secondary flex items-center gap-1.5 text-xs flex-shrink-0"
                    style={{ minHeight: '34px', padding: '0 0.9rem' }}
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

      {/* ── Disclaimer ── */}
      {data.disclaimer && (
        <div
          className="flex items-start gap-3 p-4 rounded-xl text-sm"
          style={{
            border: '1px solid var(--th-border-subtle)',
            background: 'var(--th-overlay-faint)',
            color: 'var(--th-text-muted)',
          }}
        >
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-aurora-purple)' }} />
          <p className="leading-relaxed">{renderItemText(data.disclaimer)}</p>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   TAB 2 — DEEP ANALYSIS
   ══════════════════════════════════════════════════════════════ */
function AnalysisTab({ docId, onExplain }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [section, setSection] = useState('risks')

  useEffect(() => {
    (async () => {
      try { setData(await getFullAnalysis(docId)) }
      catch { toast.error('Failed to load analysis') }
      finally { setLoading(false) }
    })()
  }, [docId])

  if (loading) return <LoadingSpinner text="Executing deep legal analysis…" />

  if (!data || (!data.risks?.length && !data.obligations?.length && !data.dates?.length)) {
    return (
      <div className="section-panel text-center" style={{ padding: '4rem 2rem' }}>
        <AlertTriangle className="w-10 h-10 mx-auto mb-4" style={{ color: 'var(--color-warning)', opacity: 0.6 }} />
        <p className="text-base font-semibold mb-2" style={{ color: 'var(--th-text-primary)' }}>Analysis could not be loaded</p>
        <p className="text-sm mb-6" style={{ color: 'var(--th-text-muted)' }}>The server returned an error. Please refresh the page to try again.</p>
        <button
          onClick={() => {
            setData(null); setLoading(true)
            getFullAnalysis(docId).then(setData).catch(() => toast.error('Retry failed')).finally(() => setLoading(false))
          }}
          className="btn-primary flex items-center gap-2 mx-auto"
        >
          <RefreshCw className="w-4 h-4" /> Retry Analysis
        </button>
      </div>
    )
  }

  const sections = [
    { key: 'risks',       label: 'Potential Risks',      count: data.risks?.length        || 0, icon: ShieldAlert,   color: 'var(--color-danger)'         },
    { key: 'obligations', label: 'Obligations & Rights', count: data.obligations?.length  || 0, icon: ClipboardList, color: 'var(--color-gold)'           },
    { key: 'dates',       label: 'Key Dates',            count: data.dates?.length        || 0, icon: Calendar,      color: 'var(--color-info)'           },
    { key: 'terms',       label: 'Defined Terms',        count: data.legal_terms?.length  || 0, icon: Tag,           color: 'var(--color-aurora-purple)'  },
    { key: 'actions',     label: 'Action Items',         count: data.action_items?.length || 0, icon: CheckCircle,   color: 'var(--color-aurora-green)'   },
  ]

  return (
    <div className="page-stack">

      {/* Section switcher pills */}
      <div className="section-panel" style={{ padding: '1rem 1.25rem' }}>
        <div className="analysis-pills">
          {sections.map(({ key, label, count, icon: Icon, color }) => (
            <button
              key={key}
              onClick={() => setSection(key)}
              className="analysis-pill"
              style={section === key
                ? { background: 'linear-gradient(135deg,rgba(108,92,231,0.18),rgba(0,206,201,0.1))', border: '1px solid rgba(108,92,231,0.3)', color: 'var(--th-text-primary)' }
                : { color: 'var(--th-text-muted)', border: '1px solid transparent' }
              }
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
              <span>{label}</span>
              <span className="analysis-pill-count">{count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Risks ── */}
      {section === 'risks' && (
        <div className="risk-cards-stack">
          {(data.risks || []).map((risk, i) => (
            <div key={i} className="risk-card">
              {/* Header row */}
              <div className="risk-card-header">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="risk-index-label">RISK-{i + 1}</span>
                  <h4 className="risk-title">{renderItemText(risk.title)}</h4>
                </div>
                <SeverityBadge severity={risk.severity} />
              </div>

              {/* Description */}
              <p className="body-text">{renderItemText(risk.description)}</p>

              {/* Clause + Audit boxes */}
              {(risk.clause_reference || risk.what_to_check) && (
                <div className="risk-evidence-grid">
                  {risk.clause_reference && (
                    <div className="quote-box text-xs font-mono">
                      <span className="font-bold" style={{ color: 'var(--th-text-muted)' }}>Clause: </span>
                      {renderItemText(risk.clause_reference)}
                    </div>
                  )}
                  {risk.what_to_check && (
                    <div className="quote-box quote-box-gold text-xs">
                      <span className="font-bold" style={{ color: 'var(--color-gold)' }}>Audit: </span>
                      {renderItemText(risk.what_to_check)}
                    </div>
                  )}
                </div>
              )}

              {/* Ask counsel */}
              {risk.question_for_lawyer && (
                <div className="risk-counsel-box">
                  <HelpCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong className="font-semibold">Ask counsel: </strong>
                    {renderItemText(risk.question_for_lawyer)}
                  </span>
                </div>
              )}
            </div>
          ))}
          {!data.risks?.length && <EmptyMsg text="No risk alerts detected." />}
        </div>
      )}

      {/* ── Obligations ── */}
      {section === 'obligations' && (
        <div className="page-stack">
          {(data.obligations || []).map((ob, i) => (
            <div key={i} className="card" style={{ padding: '1.5rem' }}>
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <span className={`badge ${ob.type === 'right' ? 'badge-low' : ob.type === 'restriction' ? 'badge-high' : 'badge-medium'}`}>
                    {renderItemText(ob.type)}
                  </span>
                  <span className="text-xs font-mono" style={{ color: 'var(--th-text-muted)' }}>
                    Party: {renderItemText(ob.party) || 'Signatory'}
                  </span>
                </div>
                {ob.deadline && (
                  <span className="text-xs font-mono" style={{ color: 'var(--color-info)' }}>
                    Due: {renderItemText(ob.deadline)}
                  </span>
                )}
              </div>
              <p className="body-text mb-2">{renderItemText(ob.description)}</p>
              {ob.clause_reference && (
                <p className="text-xs font-mono" style={{ color: 'var(--th-text-muted)' }}>
                  Source: {renderItemText(ob.clause_reference)}
                </p>
              )}
            </div>
          ))}
          {!data.obligations?.length && <EmptyMsg text="No obligations extracted." />}
        </div>
      )}

      {/* ── Dates ── */}
      {section === 'dates' && (
        <div className="page-stack">
          {(data.dates || []).map((d, i) => (
            <div key={i} className="card flex items-start gap-4" style={{ padding: '1.5rem' }}>
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(116,185,255,0.08)', border: '1px solid rgba(116,185,255,0.18)', color: 'var(--color-info)' }}
              >
                <Calendar className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-3 flex-wrap mb-1.5">
                  <h4 className="text-sm font-semibold" style={{ color: 'var(--th-text-primary)' }}>{renderItemText(d.event)}</h4>
                  {d.recurring && <span className="badge badge-info">Recurring</span>}
                </div>
                <p className="text-sm font-mono" style={{ color: 'var(--color-aurora-purple)' }}>
                  {renderItemText(d.date) || 'Specified in document'}
                </p>
                {d.clause_reference && (
                  <p className="text-xs mt-1.5" style={{ color: 'var(--th-text-muted)' }}>
                    Ref: {renderItemText(d.clause_reference)}
                  </p>
                )}
              </div>
            </div>
          ))}
          {!data.dates?.length && <EmptyMsg text="No dates found." />}
        </div>
      )}

      {/* ── Legal Terms ── */}
      {section === 'terms' && (
        <div className="page-stack">
          {(data.legal_terms || []).map((t, i) => (
            <div key={i} className="card" style={{ padding: '1.5rem' }}>
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2.5">
                <h4 className="text-sm font-mono font-bold" style={{ color: 'var(--color-aurora-purple)' }}>
                  &ldquo;{renderItemText(t.term)}&rdquo;
                </h4>
                {t.defined_in && (
                  <span className="text-xs font-mono" style={{ color: 'var(--th-text-muted)' }}>
                    {renderItemText(t.defined_in)}
                  </span>
                )}
              </div>
              <p className="body-text mb-3">{renderItemText(t.definition)}</p>
              {t.used_in?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 text-xs font-mono" style={{ color: 'var(--th-text-muted)' }}>
                  <span className="self-center mr-1">Referenced in:</span>
                  {t.used_in.map((u, ui) => (
                    <span
                      key={ui}
                      className="px-2 py-0.5 rounded-md"
                      style={{ background: 'rgba(108,92,231,0.07)', border: '1px solid rgba(108,92,231,0.14)' }}
                    >
                      {renderItemText(u)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {!data.legal_terms?.length && <EmptyMsg text="No definitions found." />}
        </div>
      )}

      {/* ── Action Items ── */}
      {section === 'actions' && (
        <div className="page-stack">
          {(data.action_items || []).map((item, i) => (
            <div key={i} className="card flex items-start gap-3.5" style={{ padding: '1.25rem 1.5rem' }}>
              <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-aurora-green)' }} />
              <p className="body-text">{renderItemText(item)}</p>
            </div>
          ))}
          {!data.action_items?.length && <EmptyMsg text="No action items." />}
        </div>
      )}
    </div>
  )
}

function EmptyMsg({ text }) {
  return (
    <div className="section-panel text-center" style={{ padding: '4rem 2rem', color: 'var(--th-text-muted)' }}>
      <p className="text-sm">{text}</p>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   TAB 3 — CLAUSE EXPLAINER
   ══════════════════════════════════════════════════════════════ */
function ExplainerTab({ docId, initialClause }) {
  const [clauseInput, setClauseInput]     = useState(initialClause || '')
  const [loading, setLoading]             = useState(false)
  const [explanation, setExplanation]     = useState(null)
  const [copied, setCopied]               = useState(false)
  const [stance, setStance]               = useState('neutral_mutual')
  const [note, setNote]                   = useState('')
  const [rewriting, setRewriting]         = useState(false)
  const [rewrite, setRewrite]             = useState(null)
  const [copiedRewrite, setCopiedRewrite] = useState(false)

  useEffect(() => {
    if (initialClause) { setClauseInput(initialClause); doExplain(initialClause) }
  }, [initialClause])

  async function doExplain(text) {
    const t = (text || clauseInput).trim()
    if (!t) { toast.error('Please enter a clause'); return }
    setLoading(true)
    try { setExplanation(await explainClause(docId, t)) }
    catch (err) { toast.error(err.message || 'Failed to simplify') }
    finally { setLoading(false) }
  }

  async function doRewrite() {
    const t = (explanation?.original_text || clauseInput).trim()
    if (!t) { toast.error('Enter a clause first'); return }
    setRewriting(true)
    try { setRewrite(await rewriteClause(docId, t, stance, note)); toast.success('Counter-proposal drafted!') }
    catch (err) { toast.error(err.message || 'Failed to draft') }
    finally { setRewriting(false) }
  }

  const samples = [
    'Either party may terminate this agreement immediately upon written notice if the other party breaches any material term and fails to cure such breach within 30 days.',
    'Indemnitor shall defend, indemnify and hold harmless Indemnitee against any and all liabilities, losses, damages, claims, and expenses arising out of negligence.',
    'During the term and for a period of 24 months post-termination, Employee shall not directly or indirectly engage in any business competitive with Company.',
  ]

  return (
    <div className="page-stack">

      {/* ── Input card ── */}
      <div className="card" style={{ padding: '1.75rem' }}>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-1.5">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4" style={{ color: 'var(--color-gold)' }} />
            <h3 className="text-base font-bold" style={{ color: 'var(--th-text-primary)' }}>
              Interactive Clause Simplifier
            </h3>
          </div>
          <span className="text-xs font-mono" style={{ color: 'var(--th-text-muted)' }}>Multi-Tier Translation</span>
        </div>
        <p className="body-text mb-5">
          Paste any legalese below — indemnification, non-compete, dispute clause — and get plain English instantly.
        </p>

        <textarea
          rows={5}
          value={clauseInput}
          onChange={e => setClauseInput(e.target.value)}
          placeholder="Paste contract clause text here…"
          className="input font-sans text-sm leading-relaxed resize-y mb-4"
          style={{ paddingTop: '0.85rem', paddingBottom: '0.85rem' }}
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: 'var(--th-text-muted)' }}>
            <span className="font-medium">Quick samples:</span>
            {samples.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { setClauseInput(samples[i]); doExplain(samples[i]) }}
                className="type-pill cursor-pointer hover:opacity-80 transition-opacity"
              >
                Sample {i + 1}
              </button>
            ))}
          </div>
          <button
            onClick={() => doExplain()}
            disabled={loading || !clauseInput.trim()}
            className="btn-primary flex items-center gap-2 text-sm"
            style={{ minHeight: '40px', padding: '0 1.2rem' }}
          >
            {loading
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Simplifying…</>
              : <><Sparkles className="w-3.5 h-3.5" />Translate</>
            }
          </button>
        </div>
      </div>

      {/* ── Results ── */}
      {explanation && (
        <div className="explainer-results">

          {/* ── Clause type / copy strip ── */}
          <div className="explainer-type-strip">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-mono" style={{ color: 'var(--th-text-muted)' }}>Clause Type</span>
              <span className="badge badge-gold">{renderItemText(explanation.clause_type) || 'General Covenant'}</span>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  `CLAUSE:\n${explanation.original_text}\n\nPLAIN ENGLISH:\n${explanation.simple_explanation}\n\nELI5:\n${explanation.very_simple_explanation}`
                )
                setCopied(true); setTimeout(() => setCopied(false), 2000); toast.success('Copied')
              }}
              className="btn-secondary flex items-center gap-1.5 text-xs flex-shrink-0"
              style={{ minHeight: '34px', padding: '0 0.9rem' }}
            >
              {copied
                ? <><Check className="w-3 h-3" style={{ color: 'var(--color-aurora-green)' }} />Copied</>
                : <><Copy className="w-3 h-3" />Copy All</>
              }
            </button>
          </div>

          {/* ── Tier explanation cards ── */}
          <div className="explainer-tier-grid">
            <div className="explainer-tier-card" style={{ borderLeft: '4px solid var(--color-aurora-violet)' }}>
              <div className="explainer-tier-header">
                <span style={{ color: 'var(--color-aurora-purple)' }}>Tier 1 · Plain English</span>
                <span className="explainer-tier-tag">Business</span>
              </div>
              <p className="body-text">{renderItemText(explanation.simple_explanation)}</p>
            </div>
            <div className="explainer-tier-card" style={{ borderLeft: '4px solid var(--color-aurora-green)' }}>
              <div className="explainer-tier-header">
                <span style={{ color: 'var(--color-aurora-green)' }}>Tier 2 · 5th Grade</span>
                <span className="explainer-tier-tag">Zero Jargon</span>
              </div>
              <p className="body-text">{renderItemText(explanation.very_simple_explanation)}</p>
            </div>
          </div>

          {/* ── Strategic Concerns ── */}
          {(explanation.potential_concern || explanation.question_for_lawyer) && (
            <div className="explainer-concerns-card">
              <h4 className="concern-heading">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                Strategic Concerns
              </h4>
              <div className="concerns-grid">
                {explanation.potential_concern && (
                  <div className="concern-box concern-box-warning">
                    <span className="concern-box-label" style={{ color: 'var(--color-warning)' }}>
                      ⚠ Potential Exposure
                    </span>
                    <p className="concern-box-text">{renderItemText(explanation.potential_concern)}</p>
                  </div>
                )}
                {explanation.question_for_lawyer && (
                  <div className="concern-box concern-box-info">
                    <span className="concern-box-label" style={{ color: 'var(--color-info)' }}>
                      💬 Ask Your Counsel
                    </span>
                    <p className="concern-box-text">{renderItemText(explanation.question_for_lawyer)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── AI Counter-Proposal Drafter ── */}
          <div className="explainer-drafter-card">
            {/* Header */}
            <div className="explainer-drafter-header">
              <div className="flex items-center gap-2">
                <PenTool className="w-4 h-4" style={{ color: 'var(--color-aurora-purple)' }} />
                <span className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: 'var(--color-aurora-purple)' }}>
                  AI Counter-Proposal Drafter
                </span>
              </div>
              <p className="text-sm mt-1" style={{ color: 'var(--th-text-muted)' }}>
                Generate a balanced or favorable replacement clause for negotiation.
              </p>
            </div>

            {/* Stance picker */}
            <div className="explainer-stance-row">
              <span className="text-xs font-mono flex-shrink-0" style={{ color: 'var(--th-text-muted)' }}>Stance:</span>
              {[
                { id: 'neutral_mutual',   label: 'Mutual'           },
                { id: 'vendor_favorable', label: 'Vendor Favorable' },
                { id: 'buyer_favorable',  label: 'Buyer Favorable'  },
              ].map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStance(s.id)}
                  className="explainer-stance-btn"
                  style={stance === s.id
                    ? { background: 'linear-gradient(135deg,var(--color-aurora-violet),#8b5cf6)', color: '#fff', border: '1px solid rgba(162,155,254,0.3)', boxShadow: '0 2px 10px rgba(108,92,231,0.3)' }
                    : { background: 'var(--th-overlay-dark)', color: 'var(--th-text-muted)', border: '1px solid var(--th-border-subtle)' }
                  }
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Note input + draft button */}
            <div className="explainer-draft-row">
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Optional instruction (e.g. 'Add 30-day cure period')…"
                className="input flex-1 text-sm"
                style={{ minHeight: '42px' }}
              />
              <button
                type="button"
                onClick={doRewrite}
                disabled={rewriting}
                className="btn-primary flex items-center gap-2 text-sm flex-shrink-0"
                style={{ minHeight: '42px', padding: '0 1.25rem' }}
              >
                {rewriting
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Drafting…</>
                  : <><Sparkles className="w-3.5 h-3.5" />Draft</>
                }
              </button>
            </div>

            {rewrite && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-5 p-5 rounded-xl"
                style={{ background: 'var(--th-overlay-dark)', border: '1px solid rgba(0,206,201,0.22)' }}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider" style={{ color: 'var(--color-aurora-cyan)' }}>
                    Proposed Alternative Clause
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(rewrite.rewritten_clause)
                      setCopiedRewrite(true); setTimeout(() => setCopiedRewrite(false), 2000); toast.success('Copied')
                    }}
                    className="btn-ghost flex items-center gap-1.5 text-xs"
                    style={{ minHeight: '30px' }}
                  >
                    {copiedRewrite
                      ? <><Check className="w-3.5 h-3.5" style={{ color: 'var(--color-aurora-green)' }} />Copied</>
                      : <><Copy className="w-3.5 h-3.5" />Copy</>
                    }
                  </button>
                </div>
                <div
                  className="p-4 rounded-xl text-sm leading-relaxed font-mono mb-4"
                  style={{ background: 'rgba(0,206,201,0.06)', border: '1px solid rgba(0,206,201,0.18)', color: 'var(--th-text-primary)' }}
                >
                  {rewrite.rewritten_clause}
                </div>
                {rewrite.key_changes?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[11px] font-mono font-bold uppercase mb-2" style={{ color: 'var(--th-text-muted)' }}>
                      Amendments Made
                    </p>
                    <ul className="text-sm space-y-1.5 list-disc list-inside" style={{ color: 'var(--th-text-secondary)' }}>
                      {rewrite.key_changes.map((c, i) => <li key={i}>{renderItemText(c)}</li>)}
                    </ul>
                  </div>
                )}
                {rewrite.negotiation_rationale && (
                  <p className="text-sm" style={{ color: 'var(--color-info)' }}>
                    <strong>Rationale: </strong>{renderItemText(rewrite.negotiation_rationale)}
                  </p>
                )}
              </motion.div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   TAB 4 — Q&A CHAT
   ══════════════════════════════════════════════════════════════ */
function ChatTab({ docId }) {
  const [messages, setMessages]           = useState([])
  const [input, setInput]                 = useState('')
  const [sending, setSending]             = useState(false)
  const [simplicity, setSimplicity]       = useState('simple')
  const [sessionId, setSessionId]         = useState(null)
  const [historyLoading, setHistoryLoading] = useState(true)
  const chatEndRef = useRef(null)

  useEffect(() => { loadHistory() }, [docId])
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function loadHistory() {
    try {
      const d = await getChatHistory(docId)
      if (d?.session_id) setSessionId(d.session_id)
      if (d?.messages?.length > 0) {
        setMessages(d.messages.map(m => ({
          role: m.role === 'assistant' ? 'ai' : m.role,
          text: renderItemText(m.text),
          sources: m.sources || [],
          confidence: m.confidence,
        })))
      }
    } catch {}
    finally { setHistoryLoading(false) }
  }

  async function clearHistory() {
    if (!window.confirm('Clear all messages?')) return
    try { await clearChatHistory(docId); setMessages([]); toast.success('Cleared') }
    catch { toast.error('Failed') }
  }

  async function handleSend(e) {
    e?.preventDefault()
    const q = input.trim()
    if (!q || sending) return
    setMessages(prev => [...prev, { role: 'user', text: q }])
    setInput(''); setSending(true)
    try {
      const res = await askQuestion(docId, q, simplicity, sessionId)
      if (res.session_id) setSessionId(res.session_id)
      setMessages(prev => [...prev, { role: 'ai', text: renderItemText(res.answer), sources: res.sources || [], confidence: res.confidence }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: `Error: ${err.message}`, error: true }])
    } finally {
      setSending(false)
    }
  }

  const suggestions = [
    'What are the primary termination triggers?',
    'Is liability capped for damages?',
    'What are my notice periods?',
    'Are there post-termination restrictions?',
  ]

  return (
    <div className="chat-shell">
      {/* ── Controls bar ── */}
      <div className="chat-controls-bar">
        <div className="chat-level-row">
          <span className="chat-level-label">Response level</span>
          <div className="chat-level-pills">
            {[
              { k: 'original',    l: 'Legal',  desc: 'Formal legal language' },
              { k: 'simple',      l: 'Plain',  desc: 'Everyday English'       },
              { k: 'very_simple', l: 'ELI5',   desc: 'Very simple terms'      },
            ].map(({ k, l, desc }) => (
              <button
                key={k}
                onClick={() => setSimplicity(k)}
                title={desc}
                className="chat-level-btn"
                style={simplicity === k
                  ? { background: 'linear-gradient(135deg,var(--color-aurora-violet),#8b5cf6)', color: '#fff', border: '1px solid rgba(162,155,254,0.3)', boxShadow: '0 2px 10px rgba(108,92,231,0.25)' }
                  : { background: 'var(--th-overlay-dark)', color: 'var(--th-text-muted)', border: '1px solid var(--th-border-subtle)' }
                }
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {messages.length > 0 && (
            <button
              onClick={clearHistory}
              className="btn-ghost flex items-center gap-1.5 text-xs"
              style={{ minHeight: '34px', color: 'var(--th-text-muted)' }}
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
          )}
          <span className="text-[11px] font-mono hidden md:block" style={{ color: 'var(--th-text-muted)', opacity: 0.7 }}>
            RAG · Multi-Turn
          </span>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="chat-messages-area">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-5">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--th-icon-box-bg)', border: '1px solid var(--th-icon-box-bd)', color: 'var(--color-aurora-purple)' }}
            >
              <MessageCircle className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-base font-bold mb-2" style={{ color: 'var(--th-text-primary)' }}>
                Ask Questions About This Document
              </h4>
              <p className="text-sm max-w-sm mx-auto" style={{ color: 'var(--th-text-muted)' }}>
                The RAG pipeline retrieves exact excerpts and generates citations with page numbers.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 max-w-lg">
              {suggestions.map(q => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="btn-secondary text-xs"
                  style={{ minHeight: '34px', padding: '0 0.9rem' }}
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
              <div className="markdown-body"><ReactMarkdown>{msg.text}</ReactMarkdown></div>
              {msg.sources?.length > 0 && (
                <div className="mt-3 pt-3 space-y-2" style={{ borderTop: '1px solid var(--th-border-subtle)' }}>
                  <p className="text-[10px] font-mono font-bold uppercase tracking-wider" style={{ color: 'var(--th-text-muted)' }}>
                    Citations
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.sources.map((s, si) => (
                      <span key={si} className="quote-box py-1 px-2.5 text-[10px] font-mono">
                        {renderItemText(s.section) || 'Doc'}{s.page ? ` [p.${s.page}]` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {msg.confidence && (
                <div className="mt-2 flex items-center gap-2 text-[11px] font-mono" style={{ color: 'var(--th-text-muted)' }}>
                  <span>Confidence:</span>
                  <span className={`badge ${msg.confidence === 'high' ? 'badge-low' : msg.confidence === 'low' ? 'badge-high' : 'badge-medium'}`}>
                    {msg.confidence}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="chat-ai flex items-center gap-2.5 text-sm" style={{ color: 'var(--th-text-muted)' }}>
              <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--color-aurora-purple)' }} />
              Scanning document vectors…
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* ── Input bar ── */}
      <form onSubmit={handleSend} className="chat-input-bar">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask anything about this agreement…"
          className="input flex-1"
          style={{ minHeight: '46px', fontSize: '0.9rem' }}
          disabled={sending}
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="btn-primary flex-shrink-0"
          style={{ minHeight: '46px', minWidth: '46px', padding: '0 1.1rem' }}
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   TAB 5 — LAWYER PREP
   ══════════════════════════════════════════════════════════════ */
function LawyerPrepTab({ docId }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try { setData(await getLawyerPrep(docId)) }
      catch { toast.error('Failed to load lawyer prep') }
      finally { setLoading(false) }
    })()
  }, [docId])

  if (loading) return <LoadingSpinner text="Compiling consultation briefing…" />
  if (!data)   return <p style={{ color: 'var(--th-text-muted)' }}>Briefing unavailable.</p>

  return (
    <div className="page-stack">

      {/* Header card */}
      <div className="card" style={{ padding: '1.75rem' }}>
        <div
          className="flex items-center justify-between flex-wrap gap-4 pb-5 mb-4"
          style={{ borderBottom: '1px solid var(--th-border-subtle)' }}
        >
          <div className="flex items-center gap-3.5">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(253,203,110,0.1)', border: '1px solid rgba(253,203,110,0.2)', color: 'var(--color-gold)' }}
            >
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold" style={{ color: 'var(--th-text-primary)' }}>
                Attorney Consultation Briefing
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--th-text-muted)' }}>
                Structured legal points & negotiation checklist
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 no-print flex-wrap">
            <a
              href={getLawyerPrepExportUrl(docId)}
              download
              className="btn-secondary flex items-center gap-1.5 text-xs"
              style={{ minHeight: '38px' }}
            >
              <FileDown className="w-3.5 h-3.5" style={{ color: 'var(--color-aurora-cyan)' }} />
              Download (.md)
            </a>
            <button
              onClick={() => window.print()}
              className="btn-secondary flex items-center gap-1.5 text-xs"
              style={{ minHeight: '38px' }}
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
          </div>
        </div>
        <p className="body-text">
          Subject: <strong style={{ color: 'var(--th-text-primary)' }}>{renderItemText(data.document_title)}</strong>
        </p>
      </div>

      {/* Priority Topics */}
      {data.key_areas_to_discuss?.length > 0 && (
        <div className="card">
          <PanelHeader icon={AlertTriangle} iconColor="var(--color-warning)" label="Priority Discussion Topics" />
          <div className="card-body">
            {data.key_areas_to_discuss.map((area, i) => (
              <div
                key={i}
                className="lawyer-topic-item"
                style={i < data.key_areas_to_discuss.length - 1
                  ? { borderBottom: '1px solid var(--th-border-subtle)', paddingBottom: '1.25rem', marginBottom: '1.25rem' }
                  : {}}
              >
                <div className="lawyer-topic-header">
                  <span className="lawyer-topic-num">{String(i + 1).padStart(2, '0')}</span>
                  <h4 className="lawyer-topic-title">{renderItemText(area.topic)}</h4>
                </div>
                {area.clause_reference && (
                  <p className="lawyer-topic-ref">
                    <span className="font-semibold">Clause:</span> {renderItemText(area.clause_reference)}
                  </p>
                )}
                <p className="body-text">{renderItemText(area.why_discuss)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Questions */}
      {data.questions_to_ask?.length > 0 && (
        <div className="card">
          <PanelHeader icon={MessageCircle} iconColor="var(--color-info)" label="Questions for Your Lawyer" />
          <div className="card-body space-y-4">
            {data.questions_to_ask.map((q, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="font-mono font-bold text-sm flex-shrink-0" style={{ color: 'var(--color-info)' }}>
                  Q{i + 1}.
                </span>
                <p className="body-text">{renderItemText(q)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documents to bring */}
      {data.documents_to_bring?.length > 0 && (
        <div className="card">
          <PanelHeader icon={FileText} iconColor="var(--color-aurora-purple)" label="Documentation Checklist" />
          <div className="card-body space-y-3.5">
            {data.documents_to_bring.map((doc, i) => (
              <div key={i} className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-aurora-purple)' }} />
                <span className="body-text">{renderItemText(doc)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action checklist */}
      {data.action_checklist?.length > 0 && (
        <div className="card">
          <PanelHeader icon={ClipboardList} iconColor="var(--color-aurora-green)" label="Pre-Consultation Actions" />
          <div className="card-body space-y-3.5">
            {data.action_checklist.map((item, i) => (
              <label key={i} className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" style={{ accentColor: 'var(--color-aurora-violet)', width: '16px', height: '16px' }} />
                <span className="body-text">{renderItemText(item)}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   TAB 6 — RAW TEXT
   ══════════════════════════════════════════════════════════════ */
function RawTextTab({ docId }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied]   = useState(false)
  const [query, setQuery]     = useState('')

  useEffect(() => {
    setLoading(true)
    getRawText(docId)
      .then(setData)
      .catch(err => { console.error(err); toast.error('Failed to load text') })
      .finally(() => setLoading(false))
  }, [docId])

  function doCopy() {
    if (!data?.full_text) return
    navigator.clipboard.writeText(data.full_text)
    setCopied(true); toast.success('Copied!'); setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return (
    <div className="card flex flex-col items-center justify-center text-center" style={{ padding: '5rem 2rem' }}>
      <Loader2 className="w-8 h-8 animate-spin mb-3" style={{ color: 'var(--color-aurora-purple)' }} />
      <p className="text-sm" style={{ color: 'var(--th-text-secondary)' }}>Retrieving document text…</p>
    </div>
  )

  if (!data?.full_text) return (
    <div className="card text-center" style={{ padding: '5rem 2rem' }}>
      <FileText className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--th-text-muted)' }} />
      <p className="text-base font-semibold mb-1" style={{ color: 'var(--th-text-primary)' }}>No Extracted Text</p>
      <p className="text-sm" style={{ color: 'var(--th-text-muted)' }}>This document may be empty or failed OCR.</p>
    </div>
  )

  const lq    = query.trim().toLowerCase()
  const lines = data.full_text.split('\n').map((line, idx) => ({
    line, idx,
    matches: lq ? line.toLowerCase().includes(lq) : false,
  }))

  return (
    <div className="page-stack">
      {/* Stats + search */}
      <div className="card flex flex-col sm:flex-row items-center justify-between gap-4" style={{ padding: '1.25rem 1.5rem' }}>
        <div className="flex flex-wrap items-center gap-2">
          {[
            { v: data.word_count, l: 'Words'      },
            { v: data.char_count, l: 'Chars'      },
            { v: data.chunk_count,l: 'RAG Chunks' },
          ].map(({ v, l }) => (
            <div
              key={l}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
              style={{ background: 'var(--th-overlay-mild)', border: '1px solid var(--th-border-subtle)' }}
            >
              <strong style={{ color: 'var(--th-text-primary)' }}>{v?.toLocaleString() ?? '—'}</strong>
              <span style={{ color: 'var(--th-text-muted)' }}>{l}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--th-text-muted)' }} />
            <input
              type="text"
              placeholder="Search text…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="input pl-9 text-xs"
              style={{ minHeight: '38px' }}
            />
          </div>
          <button
            onClick={doCopy}
            className="btn-secondary flex items-center gap-1.5 text-xs flex-shrink-0"
            style={{ minHeight: '38px', padding: '0 0.9rem' }}
          >
            {copied
              ? <><Check className="w-3.5 h-3.5" style={{ color: 'var(--color-aurora-green)' }} />Copied</>
              : <><Copy className="w-3.5 h-3.5" />Copy All</>
            }
          </button>
        </div>
      </div>

      {/* Text viewer */}
      <div className="card overflow-hidden">
        <PanelHeader
          icon={FileText}
          label="Extracted Text Stream"
          right={<span className="text-[10px] font-mono" style={{ color: 'var(--th-text-muted)' }}>{lines.length} lines{query ? ' · filtered' : ''}</span>}
        />
        <div
          className="p-5 max-h-[680px] overflow-y-auto font-mono text-xs leading-loose select-text"
          style={{ background: 'var(--th-raw-bg)', color: 'var(--th-text-secondary)' }}
        >
          {lines.map(({ line, idx, matches }) => (
            <div
              key={idx}
              className="flex items-start gap-3 py-0.5 px-2 rounded"
              style={matches ? { background: 'rgba(108,92,231,0.14)', color: 'var(--th-text-primary)', fontWeight: 600 } : {}}
            >
              <span
                className="text-[10px] select-none w-8 text-right flex-shrink-0 pt-0.5"
                style={{ color: 'var(--th-text-muted)', opacity: 0.4 }}
              >
                {idx + 1}
              </span>
              <span className="whitespace-pre-wrap break-words flex-1">
                {line || <span style={{ opacity: 0.2 }}>¶</span>}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
