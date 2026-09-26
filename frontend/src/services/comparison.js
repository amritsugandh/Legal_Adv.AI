import api from './api'

export const compareByIds = async (docAId, docBId) => {
  const { data } = await api.post('/compare/by-ids', {
    document_a_id: docAId,
    document_b_id: docBId,
  })
  return data
}

export const compareByUpload = async (fileA, fileB) => {
  const formData = new FormData()
  formData.append('file_a', fileA)
  formData.append('file_b', fileB)
  const { data } = await api.post('/compare/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export const exportComparisonCsv = async (resultData) => {
  const response = await api.post('/compare/export-csv', resultData, {
    responseType: 'blob',
  })
  const blob = new Blob([response.data], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'Contract_Comparison_Matrix.csv'
  a.click()
  window.URL.revokeObjectURL(url)
}
