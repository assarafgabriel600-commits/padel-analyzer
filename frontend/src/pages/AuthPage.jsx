import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

function Particle({ style }) {
  return <div className="particle" style={style} />;
}

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [loading, setLoading] = useState(false);
  const { login, register, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  const particles = Array.from({ length: 20 }, (_, i) => ({
    width: `${Math.random() * 4 + 2}px`,
    height: `${Math.random() * 4 + 2}px`,
    background: i % 3 === 0 ? '#00d4ff' : i % 3 === 1 ? '#00ff88' : '#a855f7',
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    animationDuration: `${Math.random() * 4 + 3}s`,
    animationDelay: `${Math.random() * 3}s`,
    opacity: 0.4,
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
        toast.success('Bienvenue ! 🎾');
      } else {
        if (!form.name.trim()) { toast.error('Nom requis'); setLoading(false); return; }
        await register(form.email, form.password, form.name);
        toast.success('Compte créé avec succès ! 🎾');
      }
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Une erreur est survenue');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center relative overflow-hidden">
      {/* Background mesh */}
      <div className="absolute inset-0 bg-mesh-gradient opacity-40" />

      {/* Animated grid */}
      <div className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: 'linear-gradient(rgba(0,212,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.3) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }}
      />

      {/* Particles */}
      {particles.map((p, i) => <Particle key={i} style={p} />)}

      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, #00d4ff, transparent)', filter: 'blur(60px)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, #00ff88, transparent)', filter: 'blur(60px)' }} />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 animate-float"
            style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(0,255,136,0.2))', border: '1px solid rgba(0,212,255,0.4)' }}>
            <span className="text-4xl">🎾</span>
          </div>
          <h1 className="text-4xl font-black text-gradient-blue mb-2">Padel AI</h1>
          <p className="text-slate-400 text-sm">Analyse de matchs par intelligence artificielle</p>
        </div>

        {/* Form card */}
        <div className="bg-glass rounded-2xl p-8 animate-slide-up" style={{ boxShadow: '0 25px 50px rgba(0,0,0,0.5), 0 0 60px rgba(0,212,255,0.05)' }}>
          {/* Toggle */}
          <div className="flex rounded-xl overflow-hidden mb-8 bg-dark-800 p-1">
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
                  mode === m
                    ? 'btn-primary text-dark-900'
                    : 'text-slate-400 hover:text-white'
                }`}>
                {m === 'login' ? 'Connexion' : 'Inscription'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Nom complet</label>
                <input
                  type="text" placeholder="Ex: Pierre Martin"
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="input-dark w-full px-4 py-3 rounded-xl text-sm"
                />
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Adresse email</label>
              <input
                type="email" placeholder="exemple@email.com"
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                className="input-dark w-full px-4 py-3 rounded-xl text-sm"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Mot de passe</label>
              <input
                type="password" placeholder="••••••••"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                className="input-dark w-full px-4 py-3 rounded-xl text-sm"
                required minLength={6}
              />
            </div>

            <button type="submit" disabled={loading}
              className="btn-primary w-full py-3.5 rounded-xl text-sm font-bold mt-2 flex items-center justify-center gap-2 disabled:opacity-60">
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-dark-900 border-t-transparent rounded-full animate-spin" />
                  {mode === 'login' ? 'Connexion...' : 'Création...'}
                </>
              ) : (
                mode === 'login' ? '→ Se connecter' : '→ Créer mon compte'
              )}
            </button>
          </form>

          <p className="text-center text-xs text-slate-500 mt-6">
            {mode === 'login' ? "Pas encore de compte ? " : "Déjà un compte ? "}
            <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="text-neon-blue hover:underline font-medium">
              {mode === 'login' ? 'Créer un compte' : 'Se connecter'}
            </button>
          </p>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          Propulsé par Claude AI · Anthropic
        </p>
      </div>
    </div>
  );
}
