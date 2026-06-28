import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Input, PasswordInput } from '../components/ui/Input'
import { Button } from '../components/ui/Button'

export default function AuthPage() {
  const [tab, setTab] = useState('login')
  const { user } = useAuth()
  const navigate = useNavigate()

  if (user) { navigate('/accueil', { replace: true }); return null }

  return (
    <div className="min-h-dvh flex flex-col bg-gradient-to-b from-brev-blue/10 to-brev-cream">
      {/* Header illustration */}
      <div className="flex flex-col items-center pt-14 pb-8 px-6">
        <div className="w-20 h-20 bg-brev-blue rounded-3xl flex items-center justify-center shadow-lg shadow-brev-blue/30 mb-5">
          <span className="text-4xl">📚</span>
        </div>
        <h1 className="text-3xl font-bold text-brev-dark tracking-tight">BrevApp</h1>
        <p className="text-gray-500 text-sm mt-1.5">Ton Brevet, sur-mesure</p>
      </div>

      {/* Card */}
      <div className="flex-1 bg-white rounded-t-3xl shadow-xl px-6 pt-6 pb-10">
        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
          {[['login', 'Connexion'], ['register', 'Inscription']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200
                ${tab === key ? 'bg-white shadow text-brev-blue' : 'text-gray-500'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'login' ? <LoginForm /> : <RegisterForm onSuccess={() => setTab('login')} />}
      </div>
    </div>
  )
}

function LoginForm() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login({ email: form.email.trim().toLowerCase(), password: form.password })
      navigate('/accueil', { replace: true })
    } catch (err) {
      setError(err.message || 'Email ou mot de passe incorrect.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {error && <ErrorBanner message={error} />}
      <Input
        label="Email"
        type="email"
        placeholder="ton@email.com"
        value={form.email}
        onChange={set('email')}
        autoComplete="email"
        required
      />
      <PasswordInput
        label="Mot de passe"
        placeholder="••••••••"
        value={form.password}
        onChange={set('password')}
        autoComplete="current-password"
        required
      />
      <Button type="submit" loading={loading} className="mt-2 w-full">
        Se connecter
      </Button>
    </form>
  )
}

function RegisterForm({ onSuccess }) {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const mismatch = form.confirm && form.confirm !== form.password

  async function submit(e) {
    e.preventDefault()
    if (mismatch) return
    setError('')
    setLoading(true)
    try {
      await register({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
      })
      navigate('/accueil', { replace: true })
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'inscription.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {error && <ErrorBanner message={error} />}
      <div className="flex gap-3">
        <Input label="Prénom" placeholder="Léa" value={form.first_name} onChange={set('first_name')} required />
        <Input label="Nom" placeholder="Martin" value={form.last_name} onChange={set('last_name')} required />
      </div>
      <Input
        label="Email"
        type="email"
        placeholder="ton@email.com"
        value={form.email}
        onChange={set('email')}
        autoComplete="email"
        required
      />
      <PasswordInput
        label="Mot de passe (8 car. min.)"
        placeholder="••••••••"
        value={form.password}
        onChange={set('password')}
        autoComplete="new-password"
        minLength={8}
        required
      />
      <PasswordInput
        label="Confirmer le mot de passe"
        placeholder="••••••••"
        value={form.confirm}
        onChange={set('confirm')}
        autoComplete="new-password"
        error={mismatch ? 'Les mots de passe ne correspondent pas.' : undefined}
        required
      />
      <Button type="submit" loading={loading} disabled={mismatch} className="mt-2 w-full">
        Créer mon compte
      </Button>
    </form>
  )
}

function ErrorBanner({ message }) {
  return (
    <div className="flex items-start gap-2 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-200">
      <span className="mt-0.5">⚠️</span>
      <span>{message}</span>
    </div>
  )
}
