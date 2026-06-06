import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { API } from '../context/AuthContext';
import { toast } from 'react-toastify';

function ScoreRing({ score }) {
  const radius = 54;
  const circ = 2 * Math.PI * radius;
  const dash = (score / 10) * circ;
  const color = score >= 7 ? '#00ff88' : score >= 5 ? '#00d4ff' : '#f59e0b';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="140" height="140" className="-rotate-90">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
        <circle cx="70" cy="70" r={radius} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 8px ${color})`, transition: 'stroke-dasharray 1.5s ease' }} />
      </svg>
      <div className="absolute text-center">
        <div className="text-4xl font-black" style={{ color }}>{score.toFixed(1)}</div>
        <div className="text-xs text-slate-400">/10</div>
      </div>
    </div>
  );
}

function Section({ icon, title, children, color = '#00d4ff' }) {
  return (
    <div className="bg-glass-light rounded-2xl p-6 neon-border">
      <h3 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
        <span>{icon}</span>
        <span style={{ color }}>{title}</span>
      </h3>
      {children}
    </div>
  );
}

function ListItems({ items, color, icon }) {
  if (!items?.length) return <p className="text-slate-500 text-sm">Aucune donnée disponible</p>;
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
          <span className="mt-0.5 flex-shrink-0" style={{ color }}>{icon || '▸'}</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function DetailSection({ label, content }) {
  if (!content) return null;
  return (
    <div className="mb-4">
      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{label}</h4>
      <p className="text-sm text-slate-300 leading-relaxed">{content}</p>
    </div>
  );
}

export default function RapportPage() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const reportRef = useRef();

  useEffect(() => {
    API.get(`/reports/${id}`)
      .then(({ data }) => setReport(data))
      .catch(() => toast.error('Rapport introuvable'))
      .finally(() => setLoading(false));
  }, [id]);

  const exportPDF = async () => {
    try {
      const { default: html2pdf } = await import('html2pdf.js');
      html2pdf()
        .set({
          margin: [10, 10],
          filename: `rapport-padel-${report.title?.replace(/\s+/g, '-') || 'match'}.pdf`,
          image: { type: 'jpeg', quality: 0.95 },
          html2canvas: { scale: 2, backgroundColor: '#050810' },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        })
        .from(reportRef.current)
        .save();
      toast.success('Export PDF en cours...');
    } catch {
      toast.error("Erreur lors de l'export PDF");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-neon-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Chargement du rapport...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="text-xl font-bold text-white mb-2">Rapport introuvable</h2>
          <Link to="/dashboard" className="text-neon-blue hover:underline text-sm">← Retour au tableau de bord</Link>
        </div>
      </div>
    );
  }

  let detailedAnalysis = {};
  try {
    const match = report.content?.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match?.[0] || '{}');
    detailedAnalysis = parsed.detailed_analysis || {};
  } catch {}

  return (
    <div className="min-h-screen bg-dark-900">
      <div className="fixed inset-0 bg-mesh-gradient opacity-20 pointer-events-none" />

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-glass border-b border-white/5 no-print">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-slate-400 hover:text-white transition-colors text-sm">
              ← Tableau de bord
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-white font-semibold text-sm truncate max-w-48">{report.title}</span>
          </div>
          <button onClick={exportPDF}
            className="btn-neon px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
            📄 Exporter PDF
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div ref={reportRef}>
          {/* Header */}
          <div className="bg-glass rounded-2xl p-8 mb-6 neon-border"
            style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.05), rgba(0,255,136,0.05))' }}>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-neon-blue bg-blue-900/30 px-2.5 py-1 rounded-full border border-blue-700/30">
                    Joueur {report.analyzed_player} analysé
                  </span>
                  {report.surface && (
                    <span className="text-xs text-slate-400 bg-dark-700 px-2.5 py-1 rounded-full border border-slate-700">
                      🎾 {report.surface}
                    </span>
                  )}
                </div>
                <h1 className="text-2xl font-black text-white mb-2">{report.title}</h1>
                <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                  {report.opponent && <span>🏆 vs {report.opponent}</span>}
                  {report.score && <span>📊 {report.score}</span>}
                  {report.date && <span>📅 {report.date}</span>}
                </div>
              </div>
              <div className="text-center">
                <ScoreRing score={report.global_score || 0} />
                <p className="text-xs text-slate-400 mt-2">Note globale</p>
              </div>
            </div>
          </div>

          {/* Summary */}
          {report.summary && (
            <Section icon="📋" title="Résumé du match">
              <p className="text-slate-300 leading-relaxed text-sm">{report.summary}</p>
            </Section>
          )}

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
            <Section icon="💪" title="Points forts" color="#00ff88">
              <ListItems items={report.strengths} color="#00ff88" icon="✓" />
            </Section>
            <Section icon="🎯" title="Points faibles" color="#f87171">
              <ListItems items={report.weaknesses} color="#f87171" icon="✗" />
            </Section>
          </div>

          {/* Positives & Improvements */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Section icon="⭐" title="Ce qu'il a bien fait" color="#fbbf24">
              <ListItems items={report.positives} color="#fbbf24" icon="★" />
            </Section>
            <Section icon="📈" title="Ce qu'il doit améliorer" color="#a855f7">
              <ListItems items={report.improvements} color="#a855f7" icon="↑" />
            </Section>
          </div>

          {/* Tactical adaptation */}
          {report.tactical_adaptation && (
            <div className="mb-4">
              <Section icon="♟️" title="Adaptation tactique" color="#00d4ff">
                <p className="text-slate-300 leading-relaxed text-sm whitespace-pre-line">{report.tactical_adaptation}</p>
              </Section>
            </div>
          )}

          {/* Detailed analysis */}
          {Object.keys(detailedAnalysis).length > 0 && (
            <div className="mb-4">
              <Section icon="🔍" title="Analyse détaillée">
                <DetailSection label="Déplacements" content={detailedAnalysis.movements} />
                <DetailSection label="Coups techniques" content={detailedAnalysis.shots} />
                <DetailSection label="Tactique" content={detailedAnalysis.tactics} />
                <DetailSection label="Mental & Gestion du stress" content={detailedAnalysis.mental} />
                <DetailSection label="Communication partenaire" content={detailedAnalysis.partnership} />
              </Section>
            </div>
          )}

          {/* Advice */}
          {report.advice?.length > 0 && (
            <Section icon="💡" title="Conseils pour les prochains matchs" color="#00ff88">
              <div className="space-y-3">
                {report.advice.map((adv, i) => (
                  <div key={i} className="flex items-start gap-3 bg-green-900/10 rounded-xl p-3 border border-green-700/20">
                    <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black text-dark-900"
                      style={{ background: 'linear-gradient(135deg, #00d4ff, #00ff88)', marginTop: '1px' }}>
                      {i + 1}
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">{adv}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Footer */}
          <div className="text-center mt-8 text-xs text-slate-600 flex items-center justify-center gap-2">
            <span>🤖</span>
            <span>Rapport généré par Claude AI · Anthropic · Padel Analyzer</span>
          </div>
        </div>
      </main>

      <style>{`@media print { .no-print { display: none !important; } }`}</style>
    </div>
  );
}
