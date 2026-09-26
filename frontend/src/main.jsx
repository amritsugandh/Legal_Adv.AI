import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'linear-gradient(145deg, #0e1225 0%, #131730 100%)',
            color: '#e8eaf6',
            border: '1px solid rgba(108, 92, 231, 0.2)',
            borderRadius: '0.75rem',
            fontSize: '0.825rem',
            boxShadow: '0 8px 40px rgba(0, 0, 0, 0.5), 0 0 16px rgba(108, 92, 231, 0.1)',
          },
          success: { iconTheme: { primary: '#55efc4', secondary: '#0e1225' } },
          error: { iconTheme: { primary: '#ff7675', secondary: '#0e1225' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
)
