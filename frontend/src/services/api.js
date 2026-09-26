import axios from 'axios'

// Priority order:
// 1. VITE_API_BASE_URL env var (set in Vercel dashboard or .env.local)
// 2. Render production backend (hardcoded fallback for production builds)
// 3. Local dev proxy via Vite (/api → http://localhost:8000)
const getBaseURL = () => {
  // Explicit env var always wins
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL
  }
  // In production builds (Vercel), use the Render backend directly
  if (import.meta.env.PROD) {
    return 'https://legallens-api.onrender.com/api'
  }
  // Local development — Vite proxy handles /api → localhost:8000
  return '/api'
}

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.detail || err.message || 'Something went wrong'
    return Promise.reject(new Error(message))
  }
)

export default api
