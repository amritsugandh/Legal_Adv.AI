import api from './api'

// Get the absolute base URL for direct links (download, export)
// Uses the same logic as api.js so links work both locally and on Vercel
const getDirectBaseURL = () => {
  if (import.meta.env.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL
  if (import.meta.env.PROD) return 'https://legallens-api.onrender.com/api'
  return '/api'
}

export const uploadDocument = async (file, documentType = null) => {
  const formData = new FormData()
  formData.append('file', file)
  if (documentType) formData.append('document_type', documentType)
  const { data } = await api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export const getDocument = async (id) => {
  const { data } = await api.get(`/documents/${id}`)
  return data
}

export const getDocumentSummary = async (id) => {
  const { data } = await api.get(`/documents/${id}/summary`)
  return data
}

export const getFullAnalysis = async (id) => {
  const { data } = await api.get(`/documents/${id}/analysis`)
  return data
}

export const getLawyerPrep = async (id) => {
  const { data } = await api.get(`/documents/${id}/lawyer-prep`)
  return data
}

export const explainClause = async (id, clauseText) => {
  const { data } = await api.post(`/documents/${id}/explain-clause`, { clause_text: clauseText })
  return data
}

export const listDocuments = async () => {
  const { data } = await api.get('/documents/')
  return data.documents || []
}

export const deleteDocument = async (id) => {
  const { data } = await api.delete(`/documents/${id}`)
  return data
}

export const getSystemStatus = async () => {
  const { data } = await api.get('/status')
  return data
}

// Direct URL links — must be absolute so browser can open/download them
export const getDownloadUrl = (id) =>
  `${getDirectBaseURL()}/documents/${id}/download`

export const getRawText = async (id) => {
  const { data } = await api.get(`/documents/${id}/raw-text`)
  return data
}

export const rewriteClause = async (id, clauseText, targetStance = 'neutral_mutual', customInstruction = '') => {
  const { data } = await api.post(`/documents/${id}/rewrite-clause`, {
    clause_text: clauseText,
    target_stance: targetStance,
    custom_instruction: customInstruction,
  })
  return data
}

// Direct URL link — must be absolute
export const getLawyerPrepExportUrl = (id) =>
  `${getDirectBaseURL()}/documents/${id}/export/lawyer-prep`
