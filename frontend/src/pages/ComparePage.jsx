import React, { useState, useEffect, Fragment } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GitCompare, Upload, FileText, ArrowRight, AlertTriangle,
  X, Info, RefreshCw, PlusCircle, Download, Eye, EyeOff,
  Layers, ChevronDown
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
  if (typeof item === 'object')
    return item.change || item.text || item.description || item.clause || item.point || item.topic || JSON.stringify(item)
  return String(item)
}

/* ── LCS word-level diff ───────────────────────────── */
function computeWordDiff(textA, textB) {
  const strA = typeof textA === 'string' ? textA : (textA ? JSON.stringify(textA) : '')
  const strB = typeof textB === 'string' ? textB : (textB ? JSON.stringify(textB) : '')
  if (!strA && !strB) return []
  if (!strA) return [{ type: 'added',   text: strB }]
  if (!strB) return [{ type: 'removed', text: strA }]
  if (strA === strB) return [{ type: 'same', text: strA }]

  const tokA = strA.match(/\S+|\s+/g) || []
  const tokB = strB.match(/\S+|\s+/g) || []
  if (tokA.length > 500 || tokB.length > 500) return [{ type:'removed', text:strA }, { type:'added', text:strB }]

  const dp = Array.from({ length: tokA.length+1 }, () => new Uint16Array(tokB.length+1))
  for (let i = 0; i < tokA.length; i++)
    for (let j = 0; j < tokB.length; j++)
      dp[i+1][j+1] = tokA[i]===tokB[j] ? dp[i][j]+1 : Math.max(dp[i+1][j], dp[i][j+1])

  let i = tokA.length, j = tokB.length
  const res = []
  while (i > 0 || j > 0) {
    if (i>0 && j>0 && tokA[i-1]===tokB[j-1]) { res.unshift({ type:'same',    text:tokA[i-1] }); i--; j-- }
    else if (j>0 && (i===0 || dp[i][j-1]>=dp[i-1][j])) { res.unshift({ type:'added',   text:tokB[j-1] }); j-- }
    else { res.unshift({ type:'removed', text:tokA[i-1] }); i-- }
  }
  const merged = []
  for (const t of res) {
    if (merged.length && merged[merged.length-1].type === t.type) merged[merged.length-1].text += t.text
    else merged.push({...t})
  }
  return merged
}

function RedlineDiffView({ textA, textB }) {
  const diff = computeWordDiff(textA, textB)
  return (
    <div className="rounded-xl p-5 space-y-4 font-mono text-xs" style={{ background:'var(--th-raw-bg)', border:'1px solid rgba(108,92,231,0.22)' }}>
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3" style={{ borderBottom:'1px solid var(--th-border-subtle)' }}>
        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider" style={{ color:'var(--color-aurora-cyan)' }}>
          <Layers className="w-3.5 h-3.5" /> Interactive Redline
        </span>
        <div className="flex items-center gap-3 flex-wrap text-[10px] font-bold">
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg" style={{ color:'#f87171', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)' }}>
            − Removed
          </span>
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg" style={{ color:'#34d399', background:'rgba(52,211,153,0.1)', border:'1px solid rgba(52,211,153,0.2)' }}>
            + Added
          </span>
        </div>
      </div>
      <div className="leading-loose select-text whitespace-pre-wrap" style={{ color:'var(--th-text-secondary)' }}>
        {diff.map((part, idx) => {
          if (part.type === 'removed') return (
            <span key={idx} className="line-through decoration-1 px-1 py-0.5 rounded mx-0.5"
              style={{ background:'rgba(239,68,68,0.12)', color:'#f87171', textDecorationColor:'rgba(239,68,68,0.55)' }}>
              {part.text}
            </span>
          )
          if (part.type === 'added') return (
            <span key={idx} className="font-semibold px-1 py-0.5 rounded mx-0.5"
              style={{ background:'rgba(52,211,153,0.12)', color:'#34d399', border:'1px solid rgba(52,211,153,0.22)' }}>
              {part.text}
            </span>
          )
          return <span key={idx}>{part.text}</span>
        })}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════ */
export default function ComparePage() {
  const [mode, setMode]       = useState('upload')
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)

  return (
    <div className="page-stack">
      {/* Header */}
      <motion.div initial={{ opacity:0, y:-12 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.3 }} className="page-header">
        <div className="page-title-block">
          <div className="icon-box flex-shrink-0"><GitCompare className="w-5 h-5" /></div>
          <div className="min-w-0">
            <p className="page-kicker">Cross-Document Auditing</p>
            <h1 className="page-title">Contract Comparison</h1>
            <p className="page-description">Compare two agreements side-by-side to pinpoint changed covenants, altered notice windows, and shifted liabilities.</p>
          </div>
        </div>
      </motion.div>

      {/* Mode tabs */}
      {!result && (
        <div className="tab-nav w-fit">
          <button className={`tab-item ${mode==='upload'?'active':''}`} onClick={()=>setMode('upload')}>
            <Upload className="w-4 h-4" /> Upload 2 Files
          </button>
          <button className={`tab-item ${mode==='existing'?'active':''}`} onClick={()=>setMode('existing')}>
            <FileText className="w-4 h-4" /> From Repository
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {!result && !loading && (
          <motion.div key={mode} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}>
            {mode==='upload' ? <UploadCompare onResult={setResult} onLoading={setLoading} /> : <ExistingCompare onResult={setResult} onLoading={setLoading} />}
          </motion.div>
        )}
      </AnimatePresence>

      {loading && <LoadingSpinner text="Performing deep comparative clause analysis…" />}
      {result  && <ComparisonResultView result={result} onReset={() => setResult(null)} />}
    </div>
  )
}

/* ── Upload two new files ─────────────────────────── */
function UploadCompare({ onResult, onLoading }) {
  const [fileA, setFileA] = useState(null)
  const [fileB, setFileB] = useState(null)

  async function go() {
    if (!fileA || !fileB) return
    onLoading(true)
    try { onResult(await compareByUpload(fileA, fileB)) }
    catch (err) { toast.error(err.message || 'Comparison failed') }
    finally { onLoading(false) }
  }

  return (
    <div className="section-panel space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <FilePickerCard label="Document A — Original / Baseline" file={fileA} onSelect={setFileA} onClear={()=>setFileA(null)} badge="Baseline" />
        <FilePickerCard label="Document B — Revised / Counterparty" file={fileB} onSelect={setFileB} onClear={()=>setFileB(null)} badge="Target" />
      </div>
      <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" style={{ borderTop:'1px solid var(--th-border-subtle)' }}>
        <p className="text-sm" style={{ color:'var(--th-text-muted)' }}>Both documents will be parsed and evaluated against standard legal covenants.</p>
        <button onClick={go} disabled={!fileA||!fileB} className="btn-primary flex-shrink-0 flex items-center gap-2">
          <GitCompare className="w-4 h-4" /> Run Comparative Audit
        </button>
      </div>
    </div>
  )
}

function FilePickerCard({ label, file, onSelect, onClear, badge }) {
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color:'var(--th-text-primary)' }}>{label}</span>
        <span className="badge badge-info flex-shrink-0">{badge}</span>
      </div>
      {file ? (
        <div className="p-4 rounded-xl flex items-center justify-between gap-3" style={{ background:'var(--th-overlay-dark)', border:'1px solid var(--th-border-default)' }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background:'var(--th-icon-box-bg)', border:'1px solid var(--th-icon-box-bd)', color:'var(--color-aurora-purple)' }}>
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color:'var(--th-text-primary)' }}>{file.name}</p>
              <p className="text-xs font-mono mt-0.5" style={{ color:'var(--th-text-muted)' }}>{(file.size/1024).toFixed(1)} KB</p>
            </div>
          </div>
          <button onClick={onClear} className="btn-ghost w-8 h-8 p-0 flex-shrink-0" style={{ minHeight:'unset', color:'var(--color-danger)' }}><X className="w-4 h-4" /></button>
        </div>
      ) : (
        <label className="dropzone block cursor-pointer" style={{ padding:'2rem 1.5rem' }}>
          <input type="file" accept=".pdf,.docx" onChange={e => { const f=e.target.files?.[0]; if(f) onSelect(f) }} className="hidden" />
          <div className="flex flex-col items-center gap-3 text-sm">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background:'var(--th-icon-box-bg)', border:'1px solid var(--th-icon-box-bd)', color:'var(--color-aurora-purple)' }}>
              <Upload className="w-5 h-5" />
            </div>
            <span className="font-semibold" style={{ color:'var(--th-text-primary)' }}>Choose Agreement File</span>
            <span className="font-mono text-xs" style={{ color:'var(--th-text-muted)' }}>PDF or DOCX</span>
          </div>
        </label>
      )}
    </div>
  )
}

/* ── Select from repository ───────────────────────── */
function ExistingCompare({ onResult, onLoading }) {
  const [docs, setDocs]           = useState([])
  const [loadingDocs, setLDocs]   = useState(true)
  const [docAId, setDocAId]       = useState('')
  const [docBId, setDocBId]       = useState('')

  useEffect(() => {
    (async () => {
      try { setDocs(await listDocuments()) }
      catch { toast.error('Failed to load documents') }
      finally { setLDocs(false) }
    })()
  }, [])

  async function go() {
    if (!docAId||!docBId) return
    if (docAId===docBId) { toast.error('Choose two different documents'); return }
    onLoading(true)
    try { onResult(await compareByIds(docAId, docBId)) }
    catch (err) { toast.error(err.message||'Comparison failed') }
    finally { onLoading(false) }
  }

  if (loadingDocs) return <LoadingSpinner text="Loading documents…" />

  if (docs.length < 2) return (
    <div className="section-panel text-center py-16 space-y-5">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto" style={{ background:'var(--th-icon-box-bg)', border:'1px solid var(--th-border-subtle)' }}>
        <Info className="w-7 h-7" style={{ color:'var(--th-text-muted)', opacity:0.5 }} />
      </div>
      <div>
        <h4 className="text-base font-bold mb-2" style={{ color:'var(--th-text-primary)' }}>At Least Two Documents Required</h4>
        <p className="text-sm max-w-sm mx-auto" style={{ color:'var(--th-text-muted)' }}>
          You have {docs.length} document{docs.length!==1?'s':''}. Upload another to enable comparison.
        </p>
      </div>
      <Link to="/upload" className="btn-primary inline-flex items-center gap-2 text-sm"><PlusCircle className="w-4 h-4" /> Upload Second Agreement</Link>
    </div>
  )

  return (
    <div className="section-panel space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {[
          { id:docAId, setId:setDocAId, label:'Document A — Original Baseline', placeholder:'Select baseline…' },
          { id:docBId, setId:setDocBId, label:'Document B — Comparison Target',  placeholder:'Select target…'   },
        ].map(({ id, setId, label, placeholder }) => (
          <div key={label} className="card p-5 space-y-3">
            <label className="block text-xs font-mono font-bold uppercase tracking-wider" style={{ color:'var(--th-text-primary)' }}>{label}</label>
            <div className="relative">
              <select value={id} onChange={e=>setId(e.target.value)} className="input appearance-none pr-10 cursor-pointer text-sm">
                <option value="">{placeholder}</option>
                {docs.map(d => <option key={d.id} value={d.id}>{d.filename}</option>)}
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color:'var(--th-text-muted)' }} />
            </div>
          </div>
        ))}
      </div>
      <div className="pt-4 flex items-center justify-end" style={{ borderTop:'1px solid var(--th-border-subtle)' }}>
        <button onClick={go} disabled={!docAId||!docBId||docAId===docBId} className="btn-primary flex items-center gap-2">
          <GitCompare className="w-4 h-4" /> Compare Selected Agreements
        </button>
      </div>
    </div>
  )
}

/* ── Comparison results ───────────────────────────── */
function ComparisonResultView({ result, onReset }) {
  const [expanded, setExpanded]       = useState({})
  const [allRedlines, setAllRedlines] = useState(false)
  const toggleRow = i => setExpanded(p => ({...p, [i]:!p[i]}))
  const alteredCount = result.comparison_table?.filter(r=>r.has_change)?.length || 0

  return (
    <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} className="space-y-6">

      {/* Header */}
      <div className="card p-5 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex flex-wrap items-center gap-3">
          {[{label:'Doc A', name:result.document_a_name},{label:'Doc B', name:result.document_b_name}].map(({label,name},i) => (
            <React.Fragment key={label}>
              {i>0 && <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color:'var(--th-text-muted)' }} />}
              <div className="px-4 py-2.5 rounded-xl text-sm font-semibold" style={{ background:'var(--th-overlay-dark)', border:'1px solid var(--th-border-default)', color:'var(--th-text-primary)' }}>
                <span className="text-[10px] font-mono block uppercase mb-0.5" style={{ color:'var(--th-text-muted)' }}>{label}</span>
                {renderItemText(name)}
              </div>
            </React.Fragment>
          ))}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => exportComparisonCsv(result)} className="btn-secondary text-sm flex items-center gap-2">
            <Download className="w-3.5 h-3.5" style={{ color:'var(--color-aurora-cyan)' }} /> Export CSV
          </button>
          <button onClick={onReset} className="btn-secondary text-sm flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5" /> New Comparison
          </button>
        </div>
      </div>

      {/* Summary */}
      {result.summary && (
        <div className="card">
          <div className="panel-header-strip">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color:'var(--th-text-primary)' }}>Executive Comparative Summary</h3>
          </div>
          <div className="p-6">
            <p className="text-sm leading-relaxed" style={{ color:'var(--th-text-secondary)' }}>{renderItemText(result.summary)}</p>
          </div>
        </div>
      )}

      {/* Material changes */}
      {result.important_changes?.length > 0 && (
        <div className="card">
          <div className="panel-header-strip">
            <div className="flex items-center gap-2.5 text-xs font-mono font-bold uppercase tracking-wider" style={{ color:'var(--color-warning)' }}>
              <AlertTriangle className="w-4 h-4" /> Material Alterations
            </div>
            <span className="text-xs font-mono" style={{ color:'var(--th-text-muted)' }}>{result.important_changes.length} flags</span>
          </div>
          <div className="p-5 space-y-3.5">
            {result.important_changes.map((change,i) => (
              <div key={i} className="flex items-start gap-3 text-sm" style={{ color:'var(--th-text-secondary)' }}>
                <span className="font-mono font-bold flex-shrink-0 mt-0.5" style={{ color:'var(--color-gold)' }}>{i+1}.</span>
                <span className="leading-relaxed">{renderItemText(change)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comparison table */}
      {result.comparison_table?.length > 0 && (
        <div className="card overflow-hidden">
          <div className="panel-header-strip flex-wrap gap-3">
            <div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color:'var(--th-text-primary)' }}>Clause-by-Clause Matrix</h3>
              <p className="text-xs mt-0.5" style={{ color:'var(--th-text-muted)' }}>{alteredCount} altered clause{alteredCount!==1?'s':''}</p>
            </div>
            {alteredCount > 0 && (
              <button onClick={() => setAllRedlines(!allRedlines)} className="btn-secondary text-xs flex items-center gap-1.5" style={{ minHeight:'34px', padding:'0 0.85rem' }}>
                <Layers className="w-3.5 h-3.5" style={{ color:'var(--color-aurora-cyan)' }} />
                {allRedlines ? 'Collapse All' : 'Expand All Redlines'}
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ background:'var(--th-table-head-bg)', borderBottom:'2px solid var(--th-table-border)' }}>
                  {['Clause Topic','Document A','Document B','Change','Risk','Redline'].map((h,hi) => (
                    <th key={h} className={`px-5 py-3.5 text-left font-mono text-[11px] font-bold uppercase tracking-wider ${hi>=3?'text-center':''}`} style={{ color:'var(--th-text-muted)', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.comparison_table.map((row, i) => {
                  const isExp = allRedlines || !!expanded[i]
                  return (
                    <Fragment key={i}>
                      <tr
                        style={{ borderBottom: isExp ? 'none' : `1px solid var(--th-table-border)`, background: row.has_change ? 'var(--th-row-changed)' : 'transparent', transition:'background 0.15s ease' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--th-row-hover)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = row.has_change ? 'var(--th-row-changed)' : 'transparent' }}
                      >
                        <td className="px-5 py-4 font-semibold align-top" style={{ color:'var(--th-text-primary)', whiteSpace:'nowrap' }}>{renderItemText(row.topic)}</td>
                        <td className="px-5 py-4 align-top leading-relaxed" style={{ color:'var(--th-text-secondary)', maxWidth:'260px' }}>{renderItemText(row.document_a)}</td>
                        <td className="px-5 py-4 align-top leading-relaxed" style={{ color:'var(--th-text-secondary)', maxWidth:'260px' }}>{renderItemText(row.document_b)}</td>
                        <td className="px-5 py-4 text-center align-top whitespace-nowrap">
                          {row.has_change ? <span className="badge badge-medium">Altered</span> : <span className="badge badge-low">Identical</span>}
                        </td>
                        <td className="px-5 py-4 text-center align-top whitespace-nowrap"><SeverityBadge severity={row.severity} /></td>
                        <td className="px-5 py-4 text-center align-top whitespace-nowrap">
                          {row.has_change ? (
                            <button onClick={() => toggleRow(i)}
                              className="btn-ghost text-xs flex items-center gap-1.5 mx-auto"
                              style={isExp
                                ? { minHeight:'30px', padding:'0 0.65rem', color:'var(--color-aurora-cyan)', border:'1px solid rgba(0,206,201,0.3)', background:'rgba(0,206,201,0.07)', borderRadius:'var(--radius-sm)' }
                                : { minHeight:'30px', padding:'0 0.65rem', color:'var(--th-text-secondary)', border:'1px solid var(--th-border-subtle)', borderRadius:'var(--radius-sm)' }}>
                              {isExp ? <><EyeOff className="w-3.5 h-3.5" />Hide</> : <><Eye className="w-3.5 h-3.5" />View</>}
                            </button>
                          ) : <span className="text-xs font-mono" style={{ color:'var(--th-text-muted)' }}>—</span>}
                        </td>
                      </tr>
                      {isExp && row.has_change && (
                        <tr style={{ borderBottom:`1px solid var(--th-table-border)`, background:'var(--th-overlay-faint)' }}>
                          <td colSpan={6} className="px-5 py-4">
                            <RedlineDiffView textA={renderItemText(row.document_a)} textB={renderItemText(row.document_b)} />
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
