import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { subjectsApi } from '../services/api'

export default function PDFViewerPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [subject, setSubject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    subjectsApi.get(id)
      .then(setSubject)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh gap-4">
        <div className="w-8 h-8 border-3 border-brev-blue border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Chargement du sujet...</p>
      </div>
    )
  }

  if (error || !subject) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh gap-4 px-8 text-center">
        <span className="text-5xl">😕</span>
        <p className="text-brev-dark font-semibold">{error || 'Sujet introuvable.'}</p>
        <button onClick={() => navigate(-1)} className="text-brev-blue text-sm font-medium">← Retour</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-dvh">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 bg-white border-b border-gray-100 shadow-sm">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
        >
          <BackIcon />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-brev-dark truncate">{subject.title}</h1>
          <p className="text-xs text-gray-400">{subject.exercise_count ?? 0} exercice{subject.exercise_count !== 1 ? 's' : ''}</p>
        </div>
        {subject.pdf_url && (
          <a
            href={subject.pdf_url}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold bg-brev-blue text-white px-3 py-2 rounded-lg hover:bg-brev-indigo transition-colors"
          >
            <DownloadIcon />
            Télécharger
          </a>
        )}
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 bg-gray-200">
        {subject.pdf_url ? (
          <iframe
            src={`${subject.pdf_url}#toolbar=1&navpanes=0`}
            title={subject.title}
            className="w-full h-full border-none"
            style={{ minHeight: 'calc(100dvh - 80px)' }}
          />
        ) : (
          <NoPDFState subject={subject} />
        )}
      </div>
    </div>
  )
}

function NoPDFState({ subject }) {
  const themes = (subject.themes || []).join(', ')
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 px-8 text-center bg-brev-cream">
      <span className="text-6xl">📋</span>
      <div>
        <h2 className="font-bold text-brev-dark mb-1">{subject.title}</h2>
        {themes && <p className="text-sm text-gray-500">{themes}</p>}
      </div>
      <p className="text-sm text-gray-400 max-w-xs">
        Le PDF est en cours de génération ou n'est pas encore disponible.
        Réessaie dans quelques instants.
      </p>
    </div>
  )
}

const BackIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
  </svg>
)

const DownloadIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
)
