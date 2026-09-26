import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import { ThemeProvider } from './context/ThemeContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--th-bg-elevated)',
              color: 'var(--th-text-primary)',
              border: '1px solid var(--th-border-default)',
              borderRadius: '0.75rem',
              fontSize: '0.825rem',
              boxShadow: 'var(--th-shadow-elevated)',
            },
            success: { iconTheme: { primary: '#55efc4', secondary: 'var(--th-bg-elevated)' } },
            error:   { iconTheme: { primary: '#ff7675', secondary: 'var(--th-bg-elevated)' } },
          }}
        />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
)
