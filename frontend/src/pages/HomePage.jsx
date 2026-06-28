import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { subjectsApi } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import SubjectCard from '../components/SubjectCard'

export default function HomePage() {
  const { user } = useAuth()
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(null)

  const load = useCallback(async () => {
    try {
      const data = await subjectsApi.list()
      setSubjects(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleDelete(subject) {
    if (!confirm(`Supprimer "${subject.title}" ?`)) return
    setDeleting(subject.id)
    try {
      await subjectsApi.delete(subject.id)
      setSubjects(s => s.filter(x => x.id !== subject.id))
    } catch (err) {
      setError(err.message)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-8">
      {/* Header */}
      <div className="mb-6">
        <p className="text-sm text-gray-500 mb-1">Bonjour {user?.first_name} 👋</p>
        <h1 className="text-2xl font-bold text-brev-dark">Mes sujets récents</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-3/4 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-1/3 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : subjects.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-3">
          {subjects.map(subject => (
            <SubjectCard
              key={subject.id}
              subject={subject}
              onDelete={deleting === subject.id ? null : handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-6xl mb-4">🎯</div>
      <h2 className="text-lg font-semibold text-brev-dark mb-2">Aucun sujet encore !</h2>
      <p className="text-gray-500 text-sm mb-6 max-w-xs">
        Crée ton premier sujet personnalisé à partir de vraies annales du Brevet.
      </p>
      <Link
        to="/creer"
        className="btn-primary inline-flex items-center gap-2 px-6 py-3 w-auto rounded-xl text-sm font-semibold bg-brev-blue text-white hover:bg-brev-indigo transition-colors"
      >
        ✨ Créer mon premier sujet
      </Link>
    </div>
  )
}
