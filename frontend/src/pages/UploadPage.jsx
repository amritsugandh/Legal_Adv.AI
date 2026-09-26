import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, FileText, X, CheckCircle, AlertCircle, Loader2, ChevronDown
} from 'lucide-react'
import { uploadDocument } from '../services/documents'
import toast from 'react-hot-toast'

const DOCUMENT_TYPES = [
  { value: '',                     label: 'Auto-detect contract category' },
  { value: 'employment_contract',  label: 'Employment Agreement' },
  { value: 'rental_agreement',     label: 'Rental / Lease Agreement' },
  { value: 'loan_agreement',       label: 'Loan & Financial Agreement' },
  { value: 'nda',                  label: 'Non-Disclosure Agreement (NDA)' },
  { value: 'service_agreement',    label: 'Master Services Agreement (MSA)' },
  { value: 'partnership_agreement',label: 'Partnership Agreement' },
  { value: 'other',                label: 'General / Custom Agreement' },
]

export default function UploadPage() {
  const navigate     = useNavigate()
  const fileInputRef = useRef(null)

  const [file, setFile]                 = useState(null)
  const [documentType, setDocumentType] = useState('')
  const [uploading, setUploading]       = useState(false)
  const [dragActive, setDragActive]     = useState(false)
  const [progress, setProgress]         = useState(0)
  const [error, setError]               = useState(null)

  function validateFile(f) {
    const ext = f.name.split('.').pop()?.toLowerCase()
    if (!['pdf', 'docx'].includes(ext)) return 'Only PDF and DOCX files are supported.'
    if (f.size > 50 * 1024 * 1024)      return 'File must be under 50 MB.'
    return null
  }

  const handleFile = useCallback((f) => {
    setError(null)
    const err = validateFile(f)
    if (err) { setError(err); return }
    setFile(f)
  }, [])

  const handleDrop     = (e) => { e.preventDefault(); setDragActive(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f) }
  const handleDragOver = (e) => { e.preventDefault(); setDragActive(true) }
  const handleDragLeave= ()  => setDragActive(false)
  const handleInput    = (e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }

  async function handleUpload() {
    if (!file || uploading) return
    setUploading(true); setProgress(15); setError(null)

    const iv = setInterval(() => setProgress(p => Math.min(p + Math.random() * 18, 88)), 350)
    try {
      const res = await uploadDocument(file, documentType || null)
      clearInterval(iv); setProgress(100)
      toast.success('Document processed successfully!')
      setTimeout(() => navigate(`/documents/${res.id}`), 500)
    } catch (err) {
      clearInterval(iv); setProgress(0)
      setError(err.message || 'Upload failed')
      toast.error(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function formatSize(b) {
    if (b < 1024)        return `${b} B`
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
    return `${(b / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="page-stack" style={{ maxWidth: '760px', marginInline: 'auto' }}>

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="page-header"
      >
        <div className="page-title-block">
          <div className="icon-box flex-shrink-0">
            <Upload className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="page-kicker">Document Intake Pipeline</p>
            <h1 className="page-title">Upload Legal Document</h1>
            <p className="page-description">
              Upload contracts in PDF or DOCX format for AI vectorization, clause
              extraction, and risk assessment.
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── Form Panel ── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="card"
      >
        <div style={{ padding: 'clamp(1.5rem,3vw,2.25rem)', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* Step 1 — File */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 mb-3">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: 'var(--th-icon-box-bg)', border: '1px solid var(--th-icon-box-bd)', color: 'var(--color-aurora-purple)' }}
              >1</span>
              <span className="text-xs font-mono font-bold uppercase tracking-widest" style={{ color: 'var(--th-text-muted)' }}>
                Select Document File
              </span>
            </div>

            <div
              className={`dropzone ${dragActive ? 'active' : ''}`}
              style={file ? { borderColor: 'var(--color-aurora-purple)', background: 'rgba(108,92,231,0.04)' } : {}}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => !file && fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" accept=".pdf,.docx" onChange={handleInput} className="hidden" />

              <AnimatePresence mode="wait">
                {file ? (
                  <motion.div
                    key="selected"
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-4"
                  >
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, rgba(108,92,231,0.18), rgba(0,206,201,0.12))',
                        border: '1px solid rgba(108,92,231,0.3)',
                        color: 'var(--color-aurora-purple)',
                        boxShadow: '0 0 24px rgba(108,92,231,0.15)',
                      }}
                    >
                      <FileText className="w-7 h-7" />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-sm" style={{ color: 'var(--th-text-primary)' }}>{file.name}</p>
                      <p className="text-xs font-mono mt-1.5" style={{ color: 'var(--th-text-muted)' }}>
                        {formatSize(file.size)} &bull; {file.name.split('.').pop()?.toUpperCase()}
                      </p>
                    </div>
                    {!uploading && (
                      <button
                        onClick={e => { e.stopPropagation(); setFile(null); setProgress(0); setError(null) }}
                        className="btn-ghost text-xs px-4"
                        style={{ color: 'var(--color-danger)', minHeight: '36px' }}
                      >
                        <X className="w-3.5 h-3.5" />
                        Remove File
                      </button>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-4"
                  >
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center"
                      style={{
                        background: 'var(--th-icon-box-bg)',
                        border: '1px solid var(--th-icon-box-bd)',
                        color: 'var(--color-aurora-purple)',
                      }}
                    >
                      <Upload className="w-7 h-7" />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-sm" style={{ color: 'var(--th-text-primary)' }}>
                        Drag & drop your legal document here
                      </p>
                      <p className="text-xs mt-1.5" style={{ color: 'var(--th-text-muted)' }}>
                        or click to browse files
                      </p>
                      <div className="flex items-center justify-center gap-2 mt-4 text-xs font-mono" style={{ color: 'var(--th-text-muted)' }}>
                        {['PDF', 'DOCX'].map(f => (
                          <span key={f} className="type-pill">{f}</span>
                        ))}
                        <span>· Up to 50 MB</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Step 2 — Contract type */}
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: 'var(--th-icon-box-bg)', border: '1px solid var(--th-icon-box-bd)', color: 'var(--color-aurora-purple)' }}
              >2</span>
              <span className="text-xs font-mono font-bold uppercase tracking-widest" style={{ color: 'var(--th-text-muted)' }}>
                Contract Classification <span style={{ opacity: 0.55, fontWeight: 400 }}>(Optional)</span>
              </span>
            </div>
            <div className="relative">
              <select
                value={documentType}
                onChange={e => setDocumentType(e.target.value)}
                className="input appearance-none pr-10 cursor-pointer"
              >
                {DOCUMENT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <ChevronDown
                className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                style={{ color: 'var(--th-text-muted)' }}
              />
            </div>
            <p className="text-xs mt-2.5 leading-relaxed" style={{ color: 'var(--th-text-muted)' }}>
              If unselected, the AI engine will automatically determine document taxonomy during processing.
            </p>
          </div>

          {/* Progress */}
          {uploading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl p-5 space-y-3.5"
              style={{
                background: 'var(--th-overlay-dark)',
                border: '1px solid rgba(108,92,231,0.2)',
              }}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono flex items-center gap-2.5" style={{ color: 'var(--th-text-secondary)' }}>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--color-aurora-purple)' }} />
                  {progress < 100 ? 'Extracting text & generating legal embeddings…' : 'Ingestion complete. Redirecting…'}
                </span>
                <span className="font-mono font-bold" style={{ color: 'var(--color-aurora-purple)' }}>
                  {Math.round(progress)}%
                </span>
              </div>
              <div
                className="w-full h-2 rounded-full overflow-hidden"
                style={{ background: 'var(--th-bg-surface)', border: '1px solid var(--th-border-subtle)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${progress}%`,
                    background: 'linear-gradient(90deg, var(--color-aurora-violet), var(--color-aurora-teal))',
                    boxShadow: '0 0 12px rgba(108,92,231,0.4)',
                  }}
                />
              </div>
            </motion.div>
          )}

          {/* Error */}
          {error && (
            <div
              className="flex items-start gap-3 rounded-xl p-4 text-sm"
              style={{
                border: '1px solid rgba(255,118,117,0.25)',
                background: 'rgba(255,118,117,0.06)',
                color: 'var(--color-danger)',
              }}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-xs mb-0.5">Intake Error</p>
                <p className="text-xs">{error}</p>
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="btn-primary w-full justify-center text-sm font-bold"
            style={{ minHeight: '50px' }}
          >
            {uploading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Processing Agreement…</>
            ) : progress === 100 ? (
              <><CheckCircle className="w-4 h-4" /> Analysis Ready — Opening Workspace…</>
            ) : (
              <><Upload className="w-4 h-4" /> Ingest &amp; Analyze Document</>
            )}
          </button>

        </div>
      </motion.div>
    </div>
  )
}
