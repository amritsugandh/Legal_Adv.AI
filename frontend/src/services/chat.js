import api from './api'

export const askQuestion = async (documentId, question, simplicityLevel = 'simple', sessionId = null) => {
  const { data } = await api.post(`/chat/${documentId}`, {
    question,
    simplicity_level: simplicityLevel,
    session_id: sessionId,
  })
  return data
}

export const getChatHistory = async (documentId, sessionId = null) => {
  const params = sessionId ? { session_id: sessionId } : {}
  const { data } = await api.get(`/chat/${documentId}/history`, { params })
  return data
}

export const clearChatHistory = async (documentId) => {
  const { data } = await api.delete(`/chat/${documentId}/history`)
  return data
}
