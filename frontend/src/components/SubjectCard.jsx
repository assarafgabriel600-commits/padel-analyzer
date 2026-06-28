import React from 'react'
import { Link } from 'react-router-dom'

const SUBJECT_LABELS = {
  histoire_geo_emc: 'Histoire-Géo-EMC',
  maths: 'Maths',
  francais: 'Français',
  sciences: 'Sciences',
}

const SUBJECT_COLORS = {
  histoire_geo_emc: 'bg-blue-100 text-blue-700',
  maths:            'bg-purple-100 text-purple-700',
  francais:         'bg-green-100 text-green-700',
  sciences:         'bg-orange-100 text-orange-700',
}

export default function SubjectCard({ subject, onDelete }) {
  const date = new Date(subject.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const themes = (subject.themes || []).slice(0, 2).join(' · ')
  const subjectCodes = subject.subjects || []

  return (
    <div className="card relative group">
      <Link to={`/sujet/${subject.id}`} className="block">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-brev-dark text-sm leading-snug line-clamp-2 mb-2">
              {subject.title}
            </h3>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {subjectCodes.map(code => (
                <span key={code} className={`text-xs font-medium px-2 py-0.5 rounded-full ${SUBJECT_COLORS[code] || 'bg-gray-100 text-gray-600'}`}>
                  {SUBJECT_LABELS[code] || code}
                </span>
              ))}
            </div>
            {themes && (
              <p className="text-xs text-gray-500 truncate">{themes}</p>
            )}
          </div>
          <div className="flex-shrink-0 w-10 h-10 bg-brev-blue/10 rounded-xl flex items-center justify-center">
            <span className="text-lg">📄</span>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <span>📋</span>
            <span>{subject.exercise_count ?? '—'} exercice{subject.exercise_count !== 1 ? 's' : ''}</span>
          </div>
          <span className="text-xs text-gray-400">{date}</span>
        </div>
      </Link>
      {onDelete && (
        <button
          onClick={(e) => { e.preventDefault(); onDelete(subject) }}
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity
                     p-1.5 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600"
          aria-label="Supprimer"
        >
          <TrashIcon />
        </button>
      )}
    </div>
  )
}

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
  </svg>
)
