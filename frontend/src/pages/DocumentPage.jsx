import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, ArrowLeft, BookOpen, ShieldAlert, MessageCircle, Briefcase,
  Send, Loader2, Calendar, Scale, Tag, ClipboardList,
  AlertTriangle, CheckCircle, Printer, Info, Sparkles,
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
  { key: 'summary',  label: 'Summary',          icon: BookOpen      },
  { key: 'analysis', label: 'Deep Analysis',     icon: ShieldAlert   },
  { key: 'explainer',label: 'Clause Simplifier', icon: Sparkles      },
  { key: 'chat',     label: 'Q&A Chat',          icon: MessageCircle },
  { key: 'lawyer',   label: 'Lawyer Prep',       icon: Briefcase     },
  { key: 'raw',      label: 'Document Text',     icon: FileText      },
]

/* shared section label */
function SectionLabel({ children }) {
  return (
    <p className="text-[11px] font-mono font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--th-text-muted)' }}>
      {children}
    </p>
  )
}

/* ══════════════════════════════════════════════════════ */
export default function DocumentPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'summary')
  const [docInfo, setDocInfo]     = useState(null)
  const [loading, setLoading]     = useState(true)
  const [selectedClause, setSelectedClause] = useState('')

  useEffect(() => { loadDoc() }, [id])

  async function loadDoc() {
    try { setLoading(true); setDocInfo(await getDocument(id)) }
    catch (err) { toast.error(err.message || 'Failed to load document') }
    finally { setLoading(false) }
  }

  function triggerExplainer(clauseText) {
    setSelectedClause(clauseText)
    setActiveTab('explainer')
  }

  if (loading) return <LoadingSpinner text="Loading document workspace…" />
  if (!docInfo) return (
    <div className="section-panel text-center py-24">
      <p className="mb-5" style={{ color: 'var(--th-text-muted)' }}>Document not found or removed.</p>
      <Link to="/" className="btn-primary">← Back to Dashboard</Link>
    </div>
  )

  const meta = docInfo.metadata || {}

  return (
    <div className="page-stack">

      {/* ── Document identity card ── */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="card overflow-hidden">

        {/* Breadcrumb bar */}
        <div
          className="px-6 py-3 flex items-center justify-between flex-wrap gap-3"
          style={{ borderBottom: '1px solid var(--th-border-subtle)', background: 'var(--th-overlay-mild)' }}
        >
          <Link to="/" className="btn-ghost text-xs flex items-center gap-1.5 -ml-2" style={{ minHeight: '32px', color: 'var(--th-text-muted)' }}>
            <ArrowLeft className="w-3.5 h-3.5" /> Workspace
          </Link>
          <div className="flex items-center gap-1 flex-wrap">
            <a href={getDownloadUrl(id)} download className="btn-ghost text-xs flex items-center gap-1.5" style={{ minHeight: '32px', color: 'var(--color-aurora-cyan)' }}>
              <Download className="w-3.5 h-3.5" /><span className="hidden sm:inline">Download</span>
            </a>
            <Link to="/compare" className="btn-ghost text-xs flex items-center gap-1.5" style={{ minHeight: '32px' }}>
              <GitCompare className="w-3.5 h-3.5" /><span className="hidden sm:inline">Compare</span>
            </Link>
            <button onClick={() => window.print()} className="btn-ghost text-xs no-print flex items-center gap-1.5" style={{ minHeight: '32px' }}>
              <Printer className="w-3.5 h-3.5" /><span className="hidden sm:inline">Print</span>
            </button>
          </div>
        </div>

        {/* Doc identity */}
        <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--th-icon-box-bg)', border: '1px solid var(--th-icon-box-bd)', color: 'var(--color-aurora-purple)' }}>
              <FileText className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold truncate" style={{ color: 'var(--th-text-primary)' }} title={docInfo.filename}>
                {docInfo.filename}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-2 text-xs font-mono" style={{ color: 'var(--th-text-muted)' }}>
                <span className="type-pill">{docInfo.file_type}</span>
                <span style={{ opacity: 0.4 }}>·</span>
                <span>{docInfo.page_count} pages</span>
                {meta.document_type && <><span style={{ opacity: 0.4 }}>·</span><span style={{ color: 'var(--th-text-secondary)' }} className="capitalize">{renderItemText(meta.document_type).replace(/_/g,' ')}</span></>}
                {meta.governing_law  && <><span style={{ opacity: 0.4 }}>·</span><span>Law: {renderItemText(meta.governing_law)}</span></>}
              </div>
            </div>
          </div>
          <span className="badge badge-low flex-shrink-0">Verified Ingestion</span>
        </div>
      </motion.div>

      {/* ── Tab navigation ── */}
      <div className="tab-nav">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} className={`tab-item ${activeTab === key ? 'active' : ''}`} onClick={() => setActiveTab(key)}>
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
          {activeTab === 'summary'  && <SummaryTab   docId={id} onExplain={triggerExplainer} />}
          {activeTab === 'analysis' && <AnalysisTab  docId={id} onExplain={triggerExplainer} />}
          {activeTab === 'explainer'&& <ExplainerTab docId={id} initialClause={selectedClause} />}
          {activeTab === 'chat'     && <ChatTab      docId={id} />}
          {activeTab === 'lawyer'   && <LawyerPrepTab docId={id} />}
          {activeTab === 'raw'      && <RawTextTab   docId={id} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/* ══ TAB 1 — SUMMARY ════════════════════════════════════ */
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

  const meta = data.metadata || {}
  const parties = Array.isArray(meta.parties) ? meta.parties.map(renderItemText).join(', ') : renderItemText(meta.parties)

  const metaFields = [
    { label: 'Category',    value: renderItemText(meta.document_type)?.replace(/_/g,' '), icon: Tag          },
    { label: 'Parties',     value: parties || '—',                                        icon: Scale        },
    { label: 'Eff. Date',   value: renderItemText(meta.effective_date) || '—',            icon: Calendar     },
    { label: 'Duration',    value: renderItemText(meta.duration) || '—',                  icon: Calendar     },
    { label: 'Jurisdiction',value: renderItemText(meta.governing_law) || '—',             icon: Scale        },
    { label: 'Clauses',     value: meta.total_clauses ? `${meta.total_clauses}` : 'Standard', icon: ClipboardList },
  ]

  return (
    <div className="page-stack">
      {/* Metadata matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {metaFields.map(({ label, value, icon: Icon }) => (
          <div key={label} className="card p-4">
            <div className="flex items-center gap-1.5 mb-2.5">
              <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--color-aurora-purple)' }} />
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider truncate" style={{ color: 'var(--th-text-muted)' }}>{label}</span>
            </div>
            <p className="text-xs font-semibold leading-snug" style={{ color: 'var(--th-text-primary)' }} title={value}>{value || '—'}</p>
          </div>
        ))}
      </div>

      {/* Executive summary */}
      <div className="card">
        <div className="panel-header-strip">
          <div className="flex items-center gap-2.5 text-xs font-mono font-bold uppercase tracking-wider" style={{ color: 'var(--th-text-primary)' }}>
            <BookOpen className="w-4 h-4" style={{ color: 'var(--color-aurora-purple)' }} /> Executive Summary
          </div>
          <span className="text-xs" style={{ color: 'var(--th-text-muted)' }}>AI Synthesized</span>
        </div>
        <div className="p-6">
          <p className="text-sm leading-relaxed" style={{ color: 'var(--th-text-secondary)' }}>{renderItemText(data.summary)}</p>
        </div>
      </div>

      {/* Key points */}
      {data.key_points?.length > 0 && (
        <div className="card">
          <div className="panel-header-strip">
            <div className="flex items-center gap-2.5 text-xs font-mono font-bold uppercase tracking-wider" style={{ color: 'var(--th-text-primary)' }}>
              <CheckCircle className="w-4 h-4" style={{ color: 'var(--color-aurora-green)' }} /> Core Takeaways
            </div>
            <span className="text-xs font-mono" style={{ color: 'var(--th-text-muted)' }}>{data.key_points.length} items</span>
          </div>
          <div className="p-6">
            <ul className="space-y-3.5">
              {data.key_points.map((pt, i) => (
                <li key={i} className="flex items-start gap-3 text-sm" style={{ color: 'var(--th-text-secondary)' }}>
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2"
                    style={{ background: 'linear-gradient(135deg,var(--color-aurora-purple),var(--color-aurora-teal))', boxShadow: '0 0 6px rgba(108,92,231,0.3)' }} />
                  <span className="leading-relaxed">{renderItemText(pt)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Important clauses */}
      {data.important_clauses?.length > 0 && (
        <div className="card">
          <div className="panel-header-strip">
            <div className="flex items-center gap-2.5 text-xs font-mono font-bold uppercase tracking-wider" style={{ color: 'var(--color-warning)' }}>
              <AlertTriangle className="w-4 h-4" /> High-Attention Clauses
            </div>
            <span className="text-xs" style={{ color: 'var(--th-text-muted)' }}>Requires Review</span>
          </div>
          <div className="p-5 space-y-3">
            {data.important_clauses.map((clause, i) => {
              const str = renderItemText(clause)
              return (
                <div key={i} className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 p-4 rounded-xl"
                  style={{ background: 'var(--th-overlay-mild)', border: '1px solid var(--th-border-subtle)' }}>
                  <div className="flex items-start gap-3 text-sm flex-1" style={{ color: 'var(--th-text-secondary)' }}>
                    <span className="font-mono font-bold flex-shrink-0 mt-0.5" style={{ color: 'var(--color-gold)' }}>{String(i+1).padStart(2,'0')}.</span>
                    <span className="leading-relaxed">{str}</span>
                  </div>
                  <button onClick={() => onExplain(str)} className="btn-secondary text-xs whitespace-nowrap self-end sm:self-start flex items-center gap-1.5"
                    style={{ minHeight: '34px', padding: '0 0.85rem' }}>
                    <Sparkles className="w-3 h-3" style={{ color: 'var(--color-gold)' }} /> Simplify
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      {data.disclaimer && (
        <div className="flex items-start gap-3 p-4 rounded-xl text-xs" style={{ border: '1px solid var(--th-border-subtle)', background: 'var(--th-overlay-faint)', color: 'var(--th-text-muted)' }}>
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-aurora-purple)' }} />
          <p className="leading-relaxed">{renderItemText(data.disclaimer)}</p>
        </div>
      )}
    </div>
  )
}

/* ══ TAB 2 — DEEP ANALYSIS ══════════════════════════════ */
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
  if (!data)   return <p style={{ color: 'var(--th-text-muted)' }}>Analysis unavailable.</p>

  const sections = [
    { key:'risks',       label:'Potential Risks',        count: data.risks?.length||0,        icon: ShieldAlert,   color:'var(--color-danger)'        },
    { key:'obligations', label:'Obligations & Rights',   count: data.obligations?.length||0,  icon: ClipboardList, color:'var(--color-gold)'          },
    { key:'dates',       label:'Key Dates',              count: data.dates?.length||0,         icon: Calendar,      color:'var(--color-info)'          },
    { key:'terms',       label:'Defined Terms',          count: data.legal_terms?.length||0,  icon: Tag,           color:'var(--color-aurora-purple)' },
    { key:'actions',     label:'Action Items',           count: data.action_items?.length||0, icon: CheckCircle,   color:'var(--color-aurora-green)'  },
  ]

  return (
    <div className="space-y-5">
      {/* Pills */}
      <div className="section-panel" style={{ padding: '0.85rem 1.1rem' }}>
        <div className="flex flex-wrap gap-2">
          {sections.map(({ key, label, count, icon: Icon, color }) => (
            <button key={key} onClick={() => setSection(key)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all"
              style={section===key
                ? { background:'linear-gradient(135deg,rgba(108,92,231,0.18),rgba(0,206,201,0.1))', border:'1px solid rgba(108,92,231,0.3)', color:'var(--th-text-primary)' }
                : { color:'var(--th-text-muted)', border:'1px solid transparent' }}>
              <Icon className="w-3.5 h-3.5" style={{ color }} />
              {label}
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-md" style={{ background:'var(--th-overlay-dark)', border:'1px solid var(--th-border-subtle)' }}>{count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Risks */}
      {section==='risks' && (
        <div className="space-y-4">
          {(data.risks||[]).map((risk,i) => (
            <div key={i} className="card p-5 space-y-3.5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-bold" style={{ color:'var(--color-danger)' }}>RISK-{i+1}</span>
                  <h4 className="text-sm font-bold" style={{ color:'var(--th-text-primary)' }}>{renderItemText(risk.title)}</h4>
                </div>
                <SeverityBadge severity={risk.severity} />
              </div>
              <p className="text-sm leading-relaxed" style={{ color:'var(--th-text-secondary)' }}>{renderItemText(risk.description)}</p>
              {(risk.clause_reference||risk.what_to_check) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2" style={{ borderTop:'1px solid var(--th-border-subtle)' }}>
                  {risk.clause_reference && <div className="quote-box text-xs font-mono"><span className="font-bold" style={{ color:'var(--th-text-muted)' }}>Clause: </span>{renderItemText(risk.clause_reference)}</div>}
                  {risk.what_to_check    && <div className="quote-box quote-box-gold text-xs"><span className="font-bold" style={{ color:'var(--color-gold)' }}>Audit: </span>{renderItemText(risk.what_to_check)}</div>}
                </div>
              )}
              {risk.question_for_lawyer && (
                <div className="p-3.5 rounded-xl text-xs flex items-start gap-2.5" style={{ background:'rgba(116,185,255,0.06)', border:'1px solid rgba(116,185,255,0.18)', color:'var(--color-info)' }}>
                  <HelpCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span><strong>Ask counsel: </strong>{renderItemText(risk.question_for_lawyer)}</span>
                </div>
              )}
            </div>
          ))}
          {!data.risks?.length && <p className="text-sm text-center py-16" style={{ color:'var(--th-text-muted)' }}>No risk alerts detected.</p>}
        </div>
      )}

      {/* Obligations */}
      {section==='obligations' && (
        <div className="space-y-4">
          {(data.obligations||[]).map((ob,i) => (
            <div key={i} className="card p-5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <span className={`badge ${ob.type==='right'?'badge-low':ob.type==='restriction'?'badge-high':'badge-medium'}`}>{renderItemText(ob.type)}</span>
                  <span className="text-xs font-mono font-semibold" style={{ color:'var(--th-text-muted)' }}>Party: {renderItemText(ob.party)||'Signatory'}</span>
                </div>
                {ob.deadline && <span className="text-xs font-mono" style={{ color:'var(--color-info)' }}>Due: {renderItemText(ob.deadline)}</span>}
              </div>
              <p className="text-sm leading-relaxed" style={{ color:'var(--th-text-secondary)' }}>{renderItemText(ob.description)}</p>
              {ob.clause_reference && <p className="text-xs font-mono" style={{ color:'var(--th-text-muted)' }}>Source: {renderItemText(ob.clause_reference)}</p>}
            </div>
          ))}
          {!data.obligations?.length && <p className="text-sm text-center py-16" style={{ color:'var(--th-text-muted)' }}>No obligations extracted.</p>}
        </div>
      )}

      {/* Dates */}
      {section==='dates' && (
        <div className="space-y-4">
          {(data.dates||[]).map((d,i) => (
            <div key={i} className="card p-5 flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background:'rgba(116,185,255,0.08)', border:'1px solid rgba(116,185,255,0.18)', color:'var(--color-info)' }}>
                <Calendar className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <h4 className="text-sm font-semibold" style={{ color:'var(--th-text-primary)' }}>{renderItemText(d.event)}</h4>
                  {d.recurring && <span className="badge badge-info">Recurring</span>}
                </div>
                <p className="text-sm font-mono mt-1.5" style={{ color:'var(--color-aurora-purple)' }}>{renderItemText(d.date)||'Specified in document'}</p>
                {d.clause_reference && <p className="text-xs mt-1" style={{ color:'var(--th-text-muted)' }}>Ref: {renderItemText(d.clause_reference)}</p>}
              </div>
            </div>
          ))}
          {!data.dates?.length && <p className="text-sm text-center py-16" style={{ color:'var(--th-text-muted)' }}>No dates found.</p>}
        </div>
      )}

      {/* Terms */}
      {section==='terms' && (
        <div className="space-y-4">
          {(data.legal_terms||[]).map((t,i) => (
            <div key={i} className="card p-5 space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="text-sm font-mono font-bold" style={{ color:'var(--color-aurora-purple)' }}>&ldquo;{renderItemText(t.term)}&rdquo;</h4>
                {t.defined_in && <span className="text-xs font-mono" style={{ color:'var(--th-text-muted)' }}>{renderItemText(t.defined_in)}</span>}
              </div>
              <p className="text-sm leading-relaxed" style={{ color:'var(--th-text-secondary)' }}>{renderItemText(t.definition)}</p>
              {t.used_in?.length>0 && (
                <div className="flex flex-wrap gap-1.5 pt-1 text-xs font-mono" style={{ color:'var(--th-text-muted)' }}>
                  <span className="mr-1">In:</span>
                  {t.used_in.map((u,ui) => (
                    <span key={ui} className="px-2 py-0.5 rounded-md" style={{ background:'rgba(108,92,231,0.07)', border:'1px solid rgba(108,92,231,0.14)' }}>{renderItemText(u)}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {!data.legal_terms?.length && <p className="text-sm text-center py-16" style={{ color:'var(--th-text-muted)' }}>No definitions found.</p>}
        </div>
      )}

      {/* Actions */}
      {section==='actions' && (
        <div className="space-y-3">
          {(data.action_items||[]).map((item,i) => (
            <div key={i} className="card p-4 flex items-start gap-3.5">
              <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color:'var(--color-aurora-green)' }} />
              <p className="text-sm leading-relaxed" style={{ color:'var(--th-text-secondary)' }}>{renderItemText(item)}</p>
            </div>
          ))}
          {!data.action_items?.length && <p className="text-sm text-center py-16" style={{ color:'var(--th-text-muted)' }}>No action items.</p>}
        </div>
      )}
    </div>
  )
}

/* ══ TAB 3 — CLAUSE EXPLAINER ═══════════════════════════ */
function ExplainerTab({ docId, initialClause }) {
  const [clauseInput, setClauseInput] = useState(initialClause || '')
  const [loading, setLoading]         = useState(false)
  const [explanation, setExplanation] = useState(null)
  const [copied, setCopied]           = useState(false)
  const [stance, setStance]           = useState('neutral_mutual')
  const [note, setNote]               = useState('')
  const [rewriting, setRewriting]     = useState(false)
  const [rewrite, setRewrite]         = useState(null)
  const [copiedRewrite, setCopiedRewrite] = useState(false)

  useEffect(() => { if (initialClause) { setClauseInput(initialClause); doExplain(initialClause) } }, [initialClause])

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
    <div className="space-y-6">
      {/* Input card */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4" style={{ color:'var(--color-gold)' }} />
            <h3 className="text-base font-bold" style={{ color:'var(--th-text-primary)' }}>Interactive Clause Simplifier</h3>
          </div>
          <span className="text-xs font-mono" style={{ color:'var(--th-text-muted)' }}>Multi-Tier Translation</span>
        </div>
        <p className="text-sm leading-relaxed" style={{ color:'var(--th-text-muted)' }}>
          Paste any legalese below — indemnification, non-compete, dispute clause — and get plain English instantly.
        </p>
        <div className="space-y-3">
          <textarea rows={4} value={clauseInput} onChange={e=>setClauseInput(e.target.value)}
            placeholder="Paste contract clause text here…"
            className="input font-sans text-sm leading-relaxed resize-y" style={{ paddingTop:'0.75rem', paddingBottom:'0.75rem' }} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color:'var(--th-text-muted)' }}>
              <span className="font-medium">Samples:</span>
              {samples.map((_,i) => (
                <button key={i} type="button" onClick={() => { setClauseInput(samples[i]); doExplain(samples[i]) }}
                  className="type-pill cursor-pointer hover:opacity-80 transition-opacity">Sample {i+1}</button>
              ))}
            </div>
            <button onClick={() => doExplain()} disabled={loading||!clauseInput.trim()} className="btn-primary text-xs flex items-center gap-2" style={{ minHeight:'38px', padding:'0 1.1rem' }}>
              {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Simplifying…</> : <><Sparkles className="w-3.5 h-3.5" />Translate</>}
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {explanation && (
        <div className="space-y-5">
          {/* Clause type strip */}
          <div className="section-panel flex items-center justify-between flex-wrap gap-3" style={{ padding:'0.85rem 1.25rem' }}>
            <div className="flex items-center gap-2.5 text-xs">
              <span className="font-mono font-semibold" style={{ color:'var(--th-text-muted)' }}>Clause Type:</span>
              <span className="badge badge-gold">{renderItemText(explanation.clause_type)||'General Covenant'}</span>
            </div>
            <button onClick={() => {
              navigator.clipboard.writeText(`CLAUSE:\n${explanation.original_text}\n\nPLAIN ENGLISH:\n${explanation.simple_explanation}\n\nELI5:\n${explanation.very_simple_explanation}`)
              setCopied(true); setTimeout(()=>setCopied(false),2000); toast.success('Copied')
            }} className="btn-secondary text-xs flex items-center gap-1.5" style={{ minHeight:'34px', padding:'0 0.85rem' }}>
              {copied ? <><Check className="w-3.5 h-3.5" style={{ color:'var(--color-aurora-green)' }} />Copied</> : <><Copy className="w-3.5 h-3.5" />Copy</>}
            </button>
          </div>

          {/* Tier cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="card p-5 space-y-2.5" style={{ borderLeft:'4px solid var(--color-aurora-violet)' }}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider" style={{ color:'var(--color-aurora-purple)' }}>Tier 1 · Plain English</span>
                <span className="text-[10px] font-mono" style={{ color:'var(--th-text-muted)' }}>Business</span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color:'var(--th-text-primary)' }}>{renderItemText(explanation.simple_explanation)}</p>
            </div>
            <div className="card p-5 space-y-2.5" style={{ borderLeft:'4px solid var(--color-aurora-green)' }}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider" style={{ color:'var(--color-aurora-green)' }}>Tier 2 · 5th Grade</span>
                <span className="text-[10px] font-mono" style={{ color:'var(--th-text-muted)' }}>Zero Jargon</span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color:'var(--th-text-secondary)' }}>{renderItemText(explanation.very_simple_explanation)}</p>
            </div>
          </div>

          {/* Concerns */}
          {(explanation.potential_concern||explanation.question_for_lawyer) && (
            <div className="card p-5 space-y-4">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2" style={{ color:'var(--color-gold)' }}>
                <AlertTriangle className="w-3.5 h-3.5" /> Strategic Concerns
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {explanation.potential_concern && (
                  <div className="p-4 rounded-xl" style={{ background:'rgba(253,203,110,0.05)', border:'1px solid rgba(253,203,110,0.15)' }}>
                    <span className="block font-semibold text-xs mb-2" style={{ color:'var(--color-warning)' }}>Potential Exposure</span>
                    <p style={{ color:'var(--th-text-secondary)' }}>{renderItemText(explanation.potential_concern)}</p>
                  </div>
                )}
                {explanation.question_for_lawyer && (
                  <div className="p-4 rounded-xl" style={{ background:'rgba(116,185,255,0.05)', border:'1px solid rgba(116,185,255,0.15)' }}>
                    <span className="block font-semibold text-xs mb-2" style={{ color:'var(--color-info)' }}>Ask Your Counsel</span>
                    <p style={{ color:'var(--th-text-secondary)' }}>{renderItemText(explanation.question_for_lawyer)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Counter-proposal drafter */}
          <div className="card p-5 space-y-5" style={{ border:'1px solid rgba(108,92,231,0.28)' }}>
            <div>
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2" style={{ color:'var(--color-aurora-purple)' }}>
                <PenTool className="w-4 h-4" /> AI Counter-Proposal Drafter
              </h4>
              <p className="text-xs mt-1" style={{ color:'var(--th-text-muted)' }}>Generate a balanced or favorable replacement clause for negotiation.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-mono self-center" style={{ color:'var(--th-text-muted)' }}>Stance:</span>
              {[{id:'neutral_mutual',label:'Mutual'},{id:'vendor_favorable',label:'Vendor Favorable'},{id:'buyer_favorable',label:'Buyer Favorable'}].map(s=>(
                <button key={s.id} type="button" onClick={()=>setStance(s.id)} className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={stance===s.id
                    ? { background:'linear-gradient(135deg,var(--color-aurora-violet),#8b5cf6)', color:'#fff', border:'1px solid rgba(162,155,254,0.3)', boxShadow:'0 2px 10px rgba(108,92,231,0.3)' }
                    : { background:'var(--th-overlay-dark)', color:'var(--th-text-muted)', border:'1px solid var(--th-border-subtle)' }}>
                  {s.label}
                </button>
              ))}
            </div>
            <div className="flex gap-3 flex-wrap sm:flex-nowrap">
              <input type="text" value={note} onChange={e=>setNote(e.target.value)} placeholder="Optional instruction (e.g. 'Add 30-day cure period')…" className="input flex-1 text-sm" />
              <button type="button" onClick={doRewrite} disabled={rewriting} className="btn-primary text-xs flex items-center gap-2 flex-shrink-0" style={{ padding:'0 1.1rem' }}>
                {rewriting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Drafting…</> : <><Sparkles className="w-3.5 h-3.5" />Draft</>}
              </button>
            </div>
            {rewrite && (
              <motion.div initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} className="p-5 rounded-xl space-y-4"
                style={{ background:'var(--th-overlay-dark)', border:'1px solid rgba(0,206,201,0.22)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider" style={{ color:'var(--color-aurora-cyan)' }}>Proposed Alternative Clause</span>
                  <button onClick={() => { navigator.clipboard.writeText(rewrite.rewritten_clause); setCopiedRewrite(true); setTimeout(()=>setCopiedRewrite(false),2000); toast.success('Copied') }}
                    className="btn-ghost text-xs flex items-center gap-1.5" style={{ minHeight:'30px' }}>
                    {copiedRewrite ? <><Check className="w-3.5 h-3.5" style={{ color:'var(--color-aurora-green)' }} />Copied</> : <><Copy className="w-3.5 h-3.5" />Copy</>}
                  </button>
                </div>
                <div className="p-4 rounded-xl text-sm leading-relaxed font-mono" style={{ background:'rgba(0,206,201,0.06)', border:'1px solid rgba(0,206,201,0.18)', color:'var(--th-text-primary)' }}>
                  {rewrite.rewritten_clause}
                </div>
                {rewrite.key_changes?.length>0 && (
                  <div>
                    <p className="text-[11px] font-mono font-bold uppercase mb-2" style={{ color:'var(--th-text-muted)' }}>Amendments Made</p>
                    <ul className="text-sm space-y-1.5 list-disc list-inside" style={{ color:'var(--th-text-secondary)' }}>
                      {rewrite.key_changes.map((c,i)=><li key={i}>{renderItemText(c)}</li>)}
                    </ul>
                  </div>
                )}
                {rewrite.negotiation_rationale && (
                  <p className="text-sm" style={{ color:'var(--color-info)' }}><strong>Rationale: </strong>{renderItemText(rewrite.negotiation_rationale)}</p>
                )}
              </motion.div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ══ TAB 4 — Q&A CHAT ═══════════════════════════════════ */
function ChatTab({ docId }) {
  const [messages, setMessages]     = useState([])
  const [input, setInput]           = useState('')
  const [sending, setSending]       = useState(false)
  const [simplicity, setSimplicity] = useState('simple')
  const [sessionId, setSessionId]   = useState(null)
  const [historyLoading, setHistoryLoading] = useState(true)
  const chatEndRef = useRef(null)

  useEffect(() => { loadHistory() }, [docId])
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages])

  async function loadHistory() {
    try {
      const d = await getChatHistory(docId)
      if (d?.session_id) setSessionId(d.session_id)
      if (d?.messages?.length>0) {
        setMessages(d.messages.map(m => ({ role: m.role==='assistant'?'ai':m.role, text: renderItemText(m.text), sources: m.sources||[], confidence: m.confidence })))
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
    setMessages(prev => [...prev, { role:'user', text:q }])
    setInput(''); setSending(true)
    try {
      const res = await askQuestion(docId, q, simplicity, sessionId)
      if (res.session_id) setSessionId(res.session_id)
      setMessages(prev => [...prev, { role:'ai', text:renderItemText(res.answer), sources:res.sources||[], confidence:res.confidence }])
    } catch (err) {
      setMessages(prev => [...prev, { role:'ai', text:`Error: ${err.message}`, error:true }])
    } finally { setSending(false) }
  }

  const suggestions = ['What are the primary termination triggers?','Is liability capped for damages?','What are my notice periods?','Are there post-termination restrictions?']

  return (
    <div className="section-panel flex flex-col" style={{ minHeight:'70vh', padding:'1.5rem' }}>
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-5" style={{ borderBottom:'1px solid var(--th-border-subtle)' }}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono" style={{ color:'var(--th-text-muted)' }}>Response level:</span>
          {[{k:'original',l:'Legal'},{k:'simple',l:'Plain'},{k:'very_simple',l:'ELI5'}].map(({k,l}) => (
            <button key={k} onClick={()=>setSimplicity(k)} className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={simplicity===k
                ? { background:'linear-gradient(135deg,var(--color-aurora-violet),#8b5cf6)', color:'#fff', border:'1px solid rgba(162,155,254,0.3)' }
                : { background:'var(--th-overlay-dark)', color:'var(--th-text-muted)', border:'1px solid var(--th-border-subtle)' }}>
              {l}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {messages.length>0 && (
            <button onClick={clearHistory} className="btn-ghost text-xs flex items-center gap-1.5" style={{ minHeight:'34px', color:'var(--th-text-muted)' }}>
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
          )}
          <span className="text-[11px] font-mono hidden md:block" style={{ color:'var(--th-text-muted)' }}>RAG · Multi-Turn</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-5 overflow-y-auto mb-5" style={{ maxHeight:'52vh', paddingRight:'4px' }}>
        {messages.length===0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background:'var(--th-icon-box-bg)', border:'1px solid var(--th-icon-box-bd)', color:'var(--color-aurora-purple)' }}>
              <MessageCircle className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-base font-bold mb-2" style={{ color:'var(--th-text-primary)' }}>Ask Questions About This Document</h4>
              <p className="text-sm max-w-sm mx-auto" style={{ color:'var(--th-text-muted)' }}>The RAG pipeline retrieves exact excerpts and generates citations with page numbers.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 max-w-lg">
              {suggestions.map(q => (
                <button key={q} onClick={() => setInput(q)} className="btn-secondary text-xs" style={{ minHeight:'34px', padding:'0 0.85rem' }}>{q}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg,i) => (
          <motion.div key={i} initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} className={`flex ${msg.role==='user'?'justify-end':'justify-start'}`}>
            <div className={msg.role==='user'?'chat-user':'chat-ai'}>
              <div className="markdown-body"><ReactMarkdown>{msg.text}</ReactMarkdown></div>
              {msg.sources?.length>0 && (
                <div className="mt-3 pt-3 space-y-2" style={{ borderTop:'1px solid var(--th-border-subtle)' }}>
                  <p className="text-[10px] font-mono font-bold uppercase tracking-wider" style={{ color:'var(--th-text-muted)' }}>Citations</p>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.sources.map((s,si) => (
                      <span key={si} className="quote-box py-1 px-2.5 text-[10px] font-mono">{renderItemText(s.section)||'Doc'}{s.page?` [p.${s.page}]`:''}</span>
                    ))}
                  </div>
                </div>
              )}
              {msg.confidence && (
                <div className="mt-2 flex items-center gap-2 text-[11px] font-mono" style={{ color:'var(--th-text-muted)' }}>
                  <span>Confidence:</span>
                  <span className={`badge ${msg.confidence==='high'?'badge-low':msg.confidence==='low'?'badge-high':'badge-medium'}`}>{msg.confidence}</span>
                </div>
              )}
            </div>
          </motion.div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="chat-ai flex items-center gap-2.5 text-sm" style={{ color:'var(--th-text-muted)' }}>
              <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color:'var(--color-aurora-purple)' }} />
              Scanning document vectors…
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex gap-3">
        <input type="text" value={input} onChange={e=>setInput(e.target.value)}
          placeholder="Ask anything about this agreement…"
          className="input flex-1 text-sm" disabled={sending} />
        <button type="submit" disabled={!input.trim()||sending} className="btn-primary px-5" style={{ minHeight:'44px' }}>
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  )
}

/* ══ TAB 5 — LAWYER PREP ════════════════════════════════ */
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
  if (!data)   return <p style={{ color:'var(--th-text-muted)' }}>Briefing unavailable.</p>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6">
        <div className="flex items-center justify-between flex-wrap gap-4 pb-5" style={{ borderBottom:'1px solid var(--th-border-subtle)' }}>
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background:'rgba(253,203,110,0.1)', border:'1px solid rgba(253,203,110,0.2)', color:'var(--color-gold)' }}>
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold" style={{ color:'var(--th-text-primary)' }}>Attorney Consultation Briefing</h3>
              <p className="text-xs mt-0.5" style={{ color:'var(--th-text-muted)' }}>Structured legal points & negotiation checklist</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 no-print flex-wrap">
            <a href={getLawyerPrepExportUrl(docId)} download className="btn-secondary text-xs flex items-center gap-1.5" style={{ minHeight:'36px' }}>
              <FileDown className="w-3.5 h-3.5" style={{ color:'var(--color-aurora-cyan)' }} /> Download (.md)
            </a>
            <button onClick={() => window.print()} className="btn-secondary text-xs flex items-center gap-1.5" style={{ minHeight:'36px' }}>
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
          </div>
        </div>
        <p className="text-sm mt-4" style={{ color:'var(--th-text-secondary)' }}>
          Subject: <strong style={{ color:'var(--th-text-primary)' }}>{renderItemText(data.document_title)}</strong>
        </p>
      </div>

      {data.key_areas_to_discuss?.length>0 && (
        <div className="card">
          <div className="panel-header-strip">
            <div className="flex items-center gap-2.5 text-xs font-mono font-bold uppercase tracking-wider" style={{ color:'var(--color-warning)' }}>
              <AlertTriangle className="w-4 h-4" /> Priority Discussion Topics
            </div>
          </div>
          <div className="p-5 space-y-5">
            {data.key_areas_to_discuss.map((area,i) => (
              <div key={i} className="pl-4 space-y-1.5" style={{ borderLeft:'3px solid var(--color-gold)' }}>
                <h4 className="text-sm font-bold" style={{ color:'var(--th-text-primary)' }}>{renderItemText(area.topic)}</h4>
                {area.clause_reference && <p className="text-xs font-mono" style={{ color:'var(--th-text-muted)' }}>Clause: {renderItemText(area.clause_reference)}</p>}
                <p className="text-sm leading-relaxed" style={{ color:'var(--th-text-secondary)' }}>{renderItemText(area.why_discuss)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.questions_to_ask?.length>0 && (
        <div className="card">
          <div className="panel-header-strip">
            <div className="flex items-center gap-2.5 text-xs font-mono font-bold uppercase tracking-wider" style={{ color:'var(--color-info)' }}>
              <MessageCircle className="w-4 h-4" /> Questions for Your Lawyer
            </div>
          </div>
          <div className="p-5 space-y-3.5">
            {data.questions_to_ask.map((q,i) => (
              <div key={i} className="flex items-start gap-3 text-sm" style={{ color:'var(--th-text-secondary)' }}>
                <span className="font-mono font-bold flex-shrink-0" style={{ color:'var(--color-info)' }}>Q{i+1}.</span>
                <span className="leading-relaxed">{renderItemText(q)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.documents_to_bring?.length>0 && (
        <div className="card">
          <div className="panel-header-strip">
            <div className="flex items-center gap-2.5 text-xs font-mono font-bold uppercase tracking-wider" style={{ color:'var(--color-aurora-purple)' }}>
              <FileText className="w-4 h-4" /> Documentation Checklist
            </div>
          </div>
          <div className="p-5 space-y-3">
            {data.documents_to_bring.map((doc,i) => (
              <div key={i} className="flex items-center gap-3 text-sm" style={{ color:'var(--th-text-secondary)' }}>
                <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color:'var(--color-aurora-purple)' }} />
                <span>{renderItemText(doc)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.action_checklist?.length>0 && (
        <div className="card">
          <div className="panel-header-strip">
            <div className="flex items-center gap-2.5 text-xs font-mono font-bold uppercase tracking-wider" style={{ color:'var(--color-aurora-green)' }}>
              <ClipboardList className="w-4 h-4" /> Pre-Consultation Actions
            </div>
          </div>
          <div className="p-5 space-y-3">
            {data.action_checklist.map((item,i) => (
              <label key={i} className="flex items-center gap-3 text-sm cursor-pointer" style={{ color:'var(--th-text-secondary)' }}>
                <input type="checkbox" className="rounded" style={{ accentColor:'var(--color-aurora-violet)' }} />
                <span>{renderItemText(item)}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ══ TAB 6 — RAW TEXT ═══════════════════════════════════ */
function RawTextTab({ docId }) {
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [copied, setCopied]     = useState(false)
  const [query, setQuery]       = useState('')

  useEffect(() => {
    setLoading(true)
    getRawText(docId).then(setData).catch(err => { console.error(err); toast.error('Failed to load text') }).finally(() => setLoading(false))
  }, [docId])

  function doCopy() {
    if (!data?.raw_text) return
    navigator.clipboard.writeText(data.raw_text)
    setCopied(true); toast.success('Copied!'); setTimeout(()=>setCopied(false),2000)
  }

  if (loading) return (
    <div className="card p-16 flex flex-col items-center justify-center text-center">
      <Loader2 className="w-8 h-8 animate-spin mb-3" style={{ color:'var(--color-aurora-purple)' }} />
      <p className="text-sm" style={{ color:'var(--th-text-secondary)' }}>Retrieving document text…</p>
    </div>
  )

  if (!data?.raw_text) return (
    <div className="card p-16 text-center">
      <FileText className="w-8 h-8 mx-auto mb-3" style={{ color:'var(--th-text-muted)' }} />
      <p className="text-base font-semibold mb-1" style={{ color:'var(--th-text-primary)' }}>No Extracted Text</p>
      <p className="text-sm" style={{ color:'var(--th-text-muted)' }}>This document may be empty or failed OCR.</p>
    </div>
  )

  const lq    = query.trim().toLowerCase()
  const lines = data.raw_text.split('\n').map((line,idx) => ({ line, idx, matches: lq ? line.toLowerCase().includes(lq) : false }))

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {[{v:data.word_count,l:'Words'},{v:data.char_count,l:'Chars'},{v:data.chunk_count,l:'RAG Chunks'}].map(({v,l}) => (
            <div key={l} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs" style={{ background:'var(--th-overlay-mild)', border:'1px solid var(--th-border-subtle)' }}>
              <strong style={{ color:'var(--th-text-primary)' }}>{v?.toLocaleString()}</strong>
              <span style={{ color:'var(--th-text-muted)' }}>{l}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color:'var(--th-text-muted)' }} />
            <input type="text" placeholder="Search…" value={query} onChange={e=>setQuery(e.target.value)}
              className="input pl-9 text-xs" style={{ minHeight:'38px' }} />
          </div>
          <button onClick={doCopy} className="btn-secondary text-xs flex items-center gap-1.5 flex-shrink-0" style={{ minHeight:'38px', padding:'0 0.9rem' }}>
            {copied ? <><Check className="w-3.5 h-3.5" style={{ color:'var(--color-aurora-green)' }} />Copied</> : <><Copy className="w-3.5 h-3.5" />Copy All</>}
          </button>
        </div>
      </div>

      {/* Viewer */}
      <div className="card overflow-hidden">
        <div className="panel-header-strip">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider" style={{ color:'var(--th-text-secondary)' }}>
            <FileText className="w-3.5 h-3.5" style={{ color:'var(--color-aurora-purple)' }} /> Extracted Text Stream
          </div>
          <span className="text-[10px] font-mono" style={{ color:'var(--th-text-muted)' }}>{lines.length} lines{query?' (filtered)':''}</span>
        </div>
        <div className="p-5 max-h-[680px] overflow-y-auto font-mono text-xs leading-loose select-text" style={{ background:'var(--th-raw-bg)', color:'var(--th-text-secondary)' }}>
          {lines.map(({ line, idx, matches }) => (
            <div key={idx} className="flex items-start gap-3 py-0.5 px-2 rounded" style={matches ? { background:'rgba(108,92,231,0.14)', color:'var(--th-text-primary)', fontWeight:600 } : {}}>
              <span className="text-[10px] select-none w-8 text-right flex-shrink-0 pt-0.5" style={{ color:'var(--th-text-muted)', opacity:0.45 }}>{idx+1}</span>
              <span className="whitespace-pre-wrap break-words flex-1">{line || <span style={{ opacity:0.2 }}>¶</span>}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
