import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function AccountPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    if (!confirm('Se déconnecter ?')) return
    setLoading(true)
    await logout()
    navigate('/auth', { replace: true })
  }

  const initials = ((user?.first_name?.[0] ?? '') + (user?.last_name?.[0] ?? '')).toUpperCase()

  return (
    <div className="max-w-lg mx-auto px-4 pt-8">
      <h1 className="text-2xl font-bold text-brev-dark mb-6">Mon compte</h1>

      {/* Avatar */}
      <div className="flex flex-col items-center py-8 card mb-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brev-blue to-brev-indigo flex items-center justify-center shadow-lg shadow-brev-blue/30 mb-4">
          <span className="text-white text-2xl font-bold">{initials}</span>
        </div>
        <h2 className="text-xl font-bold text-brev-dark">{user?.first_name} {user?.last_name}</h2>
        <p className="text-sm text-gray-500 mt-1">{user?.email}</p>
      </div>

      {/* Info rows */}
      <div className="card mb-4 divide-y divide-gray-50">
        <InfoRow icon="✉️" label="Email" value={user?.email} />
        <InfoRow icon="👤" label="Prénom" value={user?.first_name} />
        <InfoRow icon="👤" label="Nom" value={user?.last_name} />
      </div>

      <div className="card mb-6 divide-y divide-gray-50">
        <InfoRow icon="📅" label="Annales couvertes" value="2017 → 2025" />
        <InfoRow icon="📚" label="Sources" value="Strabon · Eduscol · education.gouv.fr" />
        <InfoRow icon="ℹ️" label="Version" value="1.0.0" />
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl
                   bg-red-50 text-red-600 font-semibold text-sm border border-red-200
                   hover:bg-red-100 active:scale-[0.98] transition-all disabled:opacity-50"
      >
        {loading
          ? <span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
          : '→'
        }
        Se déconnecter
      </button>

      <p className="text-center text-xs text-gray-300 mt-6 pb-4">
        BrevApp utilise uniquement des annales officielles de l'Éducation nationale
      </p>
    </div>
  )
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3 py-3.5 px-1">
      <span className="text-lg w-7 text-center">{icon}</span>
      <span className="text-sm text-gray-500 min-w-[80px]">{label}</span>
      <span className="text-sm text-brev-dark font-medium ml-auto text-right truncate max-w-[60%]">{value}</span>
    </div>
  )
}
