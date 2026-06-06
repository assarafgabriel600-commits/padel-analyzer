import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API } from '../context/AuthContext';
import { toast } from 'react-toastify';

function UploadZone({ file, onChange }) {
  const inputRef = useRef();
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith('video/')) onChange(f);
    else toast.error('Seules les vidéos sont acceptées');
  };

  return (
    <div
      className={`relative rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer ${
        dragging ? 'border-neon-blue bg-blue-900/10' : file ? 'border-neon-green bg-green-900/10' : 'border-slate-700 hover:border-neon-blue/50'
      } p-8 text-center`}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current.click()}
    >
      <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={e => onChange(e.target.files[0])} />
      {file ? (
        <div>
          <div className="text-4xl mb-3">🎬</div>
          <p className="text-neon-green font-semibold text-sm">{file.name}</p>
          <p className="text-slate-500 text-xs mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
          <button onClick={e => { e.stopPropagation(); onChange(null); }}
            className="mt-3 text-xs text-red-400 hover:text-red-300 transition-colors">
            Supprimer
          </button>
        </div>
      ) : (
        <div>
          <div className="text-4xl mb-3 opacity-40">📹</div>
          <p className="text-slate-300 font-medium text-sm mb-1">Glissez une vidéo ici</p>
          <p className="text-slate-500 text-xs">ou cliquez pour sélectionner · MP4, MOV, AVI · Max 500MB</p>
        </div>
      )}
    </div>
  );
}

function PlayerSelector({ value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[1, 2].map(p => (
        <button key={p} type="button" onClick={() => onChange(p)}
          className={`relative rounded-xl p-4 text-center transition-all duration-300 border ${
            value === p
              ? 'border-neon-blue bg-blue-900/20 shadow-lg'
              : 'border-slate-700/50 bg-dark-700 hover:border-slate-600'
          }`}
          style={value === p ? { boxShadow: '0 0 20px rgba(0,212,255,0.2)' } : {}}>
          <div className="text-3xl mb-2">{p === 1 ? '🟦' : '🟩'}</div>
          <div className={`font-semibold text-sm ${value === p ? 'text-neon-blue' : 'text-slate-400'}`}>
            Joueur {p}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {p === 1 ? 'Côté gauche / fond' : 'Côté droit / réseau'}
          </div>
          {value === p && (
            <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #00d4ff, #00ff88)' }}>
              <span className="text-dark-900 text-xs font-black">✓</span>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

function ProgressBar({ progress, label }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs text-slate-400 mb-1.5">
        <span>{label}</span>
        <span>{progress}%</span>
      </div>
      <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #00d4ff, #00ff88)',
            boxShadow: '0 0 10px rgba(0,212,255,0.5)'
          }} />
      </div>
    </div>
  );
}

const SURFACES = ['Synthétique', 'Gazon artificiel', 'Cristal', 'Extérieur', 'Intérieur'];

export default function AnalysePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    opponent: '', score: '', date: new Date().toISOString().split('T')[0],
    surface: '', description: '', analyzed_player: 1
  });
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [step, setStep] = useState('form');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description.trim() && !video) {
      toast.error('Ajoutez une vidéo ou une description du match');
      return;
    }

    setLoading(true);
    setStep('uploading');

    try {
      const fd = new FormData();
      if (video) fd.append('video', video);
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));

      const { data } = await API.post('/matches', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          setUploadProgress(Math.round((e.loaded * 100) / e.total));
        }
      });

      setStep('analyzing');
      toast.success('Analyse lancée ! Vous serez redirigé automatiquement.');

      // Poll for completion
      const poll = setInterval(async () => {
        try {
          const { data: status } = await API.get(`/matches/${data.matchId}/status`);
          if (status.status === 'completed') {
            clearInterval(poll);
            const { data: report } = await API.get(`/reports/match/${data.matchId}`);
            navigate(`/rapport/${report.id}`);
          } else if (status.status === 'error') {
            clearInterval(poll);
            toast.error("Erreur lors de l'analyse");
            setLoading(false);
            setStep('form');
          }
        } catch { clearInterval(poll); setLoading(false); setStep('form'); }
      }, 3000);

    } catch (err) {
      toast.error(err.response?.data?.error || "Erreur lors de l'envoi");
      setLoading(false);
      setStep('form');
    }
  };

  if (step === 'uploading' || step === 'analyzing') {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="max-w-md w-full px-6">
          <div className="bg-glass rounded-2xl p-10 text-center neon-border">
            <div className="text-6xl mb-6 animate-float">🤖</div>
            <h2 className="text-2xl font-black text-white mb-2">
              {step === 'uploading' ? 'Upload en cours...' : 'Analyse en cours...'}
            </h2>
            <p className="text-slate-400 text-sm mb-8">
              {step === 'uploading'
                ? 'Envoi de la vidéo vers les serveurs'
                : 'Claude AI analyse votre match en détail'}
            </p>

            {step === 'uploading' && <ProgressBar progress={uploadProgress} label="Upload vidéo" />}

            {step === 'analyzing' && (
              <div className="space-y-2">
                {['Analyse des déplacements', 'Évaluation des coups', 'Analyse tactique', 'Génération du rapport'].map((s, i) => (
                  <ProgressBar key={s} progress={Math.min(100, Math.max(0, (Date.now() % 12000) / 120 - i * 25))} label={s} />
                ))}
              </div>
            )}

            <div className="mt-6 flex items-center justify-center gap-2 text-slate-500 text-xs">
              <span className="w-3 h-3 border border-neon-blue border-t-transparent rounded-full animate-spin" />
              Cela peut prendre quelques secondes...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900">
      <div className="fixed inset-0 bg-mesh-gradient opacity-20 pointer-events-none" />

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-glass border-b border-white/5">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center gap-4">
          <Link to="/dashboard" className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-1">
            ← Tableau de bord
          </Link>
          <span className="text-slate-600">/</span>
          <span className="text-white font-semibold text-sm">Analyser un match</span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white mb-2">Analyser un match 🎾</h1>
          <p className="text-slate-400 text-sm">Uploadez votre vidéo et renseignez les informations du match</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Video */}
          <section className="bg-glass rounded-2xl p-6 neon-border">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">
              📹 Vidéo du match
            </h2>
            <UploadZone file={video} onChange={setVideo} />
            <p className="text-xs text-slate-500 mt-3 text-center">
              La vidéo est optionnelle — une analyse peut être réalisée uniquement à partir de la description
            </p>
          </section>

          {/* Match info */}
          <section className="bg-glass rounded-2xl p-6 neon-border">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">
              🏆 Informations du match
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Adversaire(s)</label>
                <input value={form.opponent} onChange={e => setForm({ ...form, opponent: e.target.value })}
                  placeholder="Ex: Équipe Martin / Dupont"
                  className="input-dark w-full px-4 py-2.5 rounded-xl text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Score final</label>
                <input value={form.score} onChange={e => setForm({ ...form, score: e.target.value })}
                  placeholder="Ex: 6-3 / 4-6 / 6-4"
                  className="input-dark w-full px-4 py-2.5 rounded-xl text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Date</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                  className="input-dark w-full px-4 py-2.5 rounded-xl text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Surface</label>
                <select value={form.surface} onChange={e => setForm({ ...form, surface: e.target.value })}
                  className="input-dark w-full px-4 py-2.5 rounded-xl text-sm">
                  <option value="">Sélectionner...</option>
                  {SURFACES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* Description */}
          <section className="bg-glass rounded-2xl p-6 neon-border">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">
              📝 Description du match
            </h2>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              rows={5} placeholder="Décrivez le match en détail : style de jeu des adversaires, points clés, situations difficiles, votre ressenti, les échanges marquants...
Ex: Match tendu au 3ème set. Adversaires très agressifs au filet. J'ai eu du mal avec les lobes et j'ai commis beaucoup d'erreurs directes en fin de set..."
              className="input-dark w-full px-4 py-3 rounded-xl text-sm resize-none" />
          </section>

          {/* Player selector */}
          <section className="bg-glass rounded-2xl p-6 neon-border">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">
              👤 Joueur à analyser
            </h2>
            <PlayerSelector value={form.analyzed_player} onChange={v => setForm({ ...form, analyzed_player: v })} />
          </section>

          <button type="submit" disabled={loading}
            className="btn-primary w-full py-4 rounded-xl font-black text-base flex items-center justify-center gap-3 disabled:opacity-60">
            <span>🤖</span>
            Analyser ce match avec l'IA
          </button>
        </form>
      </main>
    </div>
  );
}
