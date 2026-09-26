import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import DashboardPage from './pages/DashboardPage'
import UploadPage from './pages/UploadPage'
import DocumentPage from './pages/DocumentPage'
import ComparePage from './pages/ComparePage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/documents/:id" element={<DocumentPage />} />
        <Route path="/compare" element={<ComparePage />} />
      </Route>
    </Routes>
  )
}
