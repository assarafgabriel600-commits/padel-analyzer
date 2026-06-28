import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import AuthPage from './pages/AuthPage'
import HomePage from './pages/HomePage'
import CreatePage from './pages/CreatePage'
import AccountPage from './pages/AccountPage'
import PDFViewerPage from './pages/PDFViewerPage'
import Layout from './components/Layout'

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Splash />
  if (!user) return <Navigate to="/auth" replace />
  return children
}

function Splash() {
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-brev-cream gap-4">
      <div className="text-5xl">📚</div>
      <p className="text-brev-blue font-bold text-2xl tracking-tight">BrevApp</p>
      <div className="w-6 h-6 border-2 border-brev-blue border-t-transparent rounded-full animate-spin mt-2" />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="/accueil" replace />} />
            <Route path="accueil" element={<HomePage />} />
            <Route path="creer" element={<CreatePage />} />
            <Route path="compte" element={<AccountPage />} />
            <Route path="sujet/:id" element={<PDFViewerPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
