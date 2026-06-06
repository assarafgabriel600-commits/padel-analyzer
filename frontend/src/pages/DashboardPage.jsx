import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, API } from '../context/AuthContext';
import { toast } from 'react-toastify';

function ScoreBadge({ score }) {
  const color = score >= 7 ? '#00ff88' : score >= 5 ? '#00d4ff' : '#f59e0b';
  return (
    <div className="text-2xl font-black" style={{ color }}>
      {score ? score.toFixed(1) : '—'}
      {score ? <span className="text-xs font-normal text-slate-500">/10</span> : ''}
    </div>
  );
}

function StatusBadge({ status }) {
  const configs = {
    completed: { label: 'Terminé', color: 'text-neon-green bg-green-900/30 border-green-700/30' },
    analyzing: { label: 'En cours...', color: 'text-neon-blue bg-blue-900/30 border-blue-700/30' },
    pending: { label: 'En attente', color: 'text-yellow-400 bg-yellow-900/30 border-yellow-700/30' },
    error: { label: 'Erreur', color: 'text-red-400 bg-red-900/30 border-red-700/30' },
  };
  const c = configs[status] || configs.pending;
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${c.color}`}>
      {status === 'analyzing' && <span className="inline-block w-2 h-2 rounded-full bg-neon-blue mr-1.5 animate-pulse" />}
      {c.label}
    </span>
  );
}

function MatchCard({ match, onRefresh }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (match.status === 'analyzing') {
      const timer = setInterval(async () => {
        try {
          const { data } = await API.get(`/matches/${match.id}/status`);
          if (data.status === 'completed' || data.status === 'error') {
            clearInterval(timer);
            onRefresh();
          }
        } catch { clearInterval(timer); }
      }, 3000);
      return () => clearInterval(timer);
    }
  }, [match.id, match.status, onRefresh]);

  return (
    <div className="bg-glass-light rounded-xl p-5 card-hover cursor-pointer neon-border"
      onClick={() => match.status === 'completed' && match.report_id && navigate(`/rapport/${match.report_id}`)}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-sm truncate">{match.title || `Match vs ${match.opponent}`}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{match.date || 'Date non précisée'}</p>
        </div>
        <StatusBadge status={match.status} />
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-400 mb-4">
        {match.score && <span>🏆 {match.score}</span>}
        {match.surface && <span>🎾 {match.surface}</span>}
        <span>👤 Joueur {match.analyzed_player}</span>
      </div>

      <div className="flex items-center justify-between">
        <ScoreBadge score={match.global_score} />
        {match.status === 'completed' && match.report_id ? (
          <button className="btn-neon text-xs px-3 py-1.5 rounded-lg font-semibold">
            Voir le rapport →
          </button>
        ) : match.status === 'analyzing' ? (
          <span className="text-xs text-slate-500 flex items-center gap-1.5">
            <span className="w-3 h-3 border border-neon-blue border-t-transparent rounded-full animate-spin" />
            Analyse en cours
          </span>
        ) : null}
      </div>
    </div>
  );
}

function StatsCard({ matches }) {
  const completed = matches.filter(m => m.status === 'completed');
  const avgScore = completed.length
    ? (completed.reduce((a, m) => a + (m.global_score || 0), 0) / completed.length).toFixed(1)
    : null;

  return (
    <div className="grid grid-cols-3 gap-4 mb-8">
      {[
        { label: 'Matchs analysés', value: completed.length, icon: '📊', color: '#00d4ff' },
        { label: 'Note moyenne', value: avgScore ? `${avgScore}/10` : '—', icon: '⭐', color: '#00ff88' },
        { label: 'Total matchs', value: matches.length, icon: '🎾', color: '#a855f7' },
      ].map(({ label, value, icon, color }) => (
        <div key={label} className="bg-glass-light rounded-xl p-4 neon-border text-center">
          <div className="text-2xl mb-2">{icon}</div>
          <div className="text-2xl font-black mb-1" style={{ color }}>{value}</div>
          <div className="text-xs text-slate-500">{label}</div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchMatches = async () => {
    try {
      const { data } = await API.get('/matches');
      setMatches(data);
    } catch (err) {
      toast.error('Erreur lors du chargement');
    }
    setLoading(false);
  };

  useEffect(() => { fetchMatches(); }, []);

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Background */}
      <div className="fixed inset-0 bg-mesh-gradient opacity-20 pointer-events-none" />

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-glass border-b border-white/5">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <span className="text-2xl">🎾</span>
            <span className="font-black text-gradient-blue text-lg">Padel AI</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">Bonjour, <span className="text-white font-medium">{user?.name}</span></span>
            <button onClick={logout} className="text-xs text-slate-500 hover:text-red-400 transition-colors">
              Déconnexion
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-white mb-1">Tableau de bord</h1>
            <p className="text-slate-400 text-sm">Gérez et analysez vos matchs de padel</p>
          </div>
          <button onClick={() => navigate('/analyser')}
            className="btn-primary px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2">
            <span>+</span> Analyser un match
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-12 h-12 border-2 border-neon-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-400 text-sm">Chargement...</p>
            </div>
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-6 animate-float">🎾</div>
            <h2 className="text-xl font-bold text-white mb-3">Aucun match analysé</h2>
            <p className="text-slate-400 text-sm mb-8 max-w-md mx-auto">
              Uploadez votre première vidéo de match pour recevoir une analyse complète par IA
            </p>
            <button onClick={() => navigate('/analyser')}
              className="btn-primary px-8 py-3 rounded-xl font-bold text-sm inline-flex items-center gap-2">
              🚀 Analyser mon premier match
            </button>
          </div>
        ) : (
          <>
            <StatsCard matches={matches} />
            <h2 className="text-lg font-bold text-white mb-4">Historique des matchs</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {matches.map(match => (
                <MatchCard key={match.id} match={match} onRefresh={fetchMatches} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
