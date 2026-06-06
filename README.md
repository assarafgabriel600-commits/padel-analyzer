# 🎾 Padel AI — Analyseur de matchs

Application web d'analyse de matchs de padel par intelligence artificielle (Claude AI).

**Stack :** React + Tailwind CSS · Node.js + Express · SQLite (sql.js) · Anthropic Claude

---

## 🚀 Déploiement en production

### Prérequis
- Compte [GitHub](https://github.com) — pour héberger le code
- Compte [Render](https://render.com) — backend gratuit
- Compte [Vercel](https://vercel.com) — frontend gratuit
- Clé API [Anthropic](https://console.anthropic.com)

---

### ÉTAPE 1 — Pousser le code sur GitHub

1. Crée un nouveau dépôt sur [github.com/new](https://github.com/new)
   - Nom : `padel-analyzer`
   - Visibilité : **Private** (recommandé car contient config)

2. Dans le dossier `padel analyzer/`, ouvre un terminal et exécute :

```bash
git init
git add .
git commit -m "Initial commit — Padel AI"
git remote add origin https://github.com/TON_USERNAME/padel-analyzer.git
git push -u origin main
```

---

### ÉTAPE 2 — Déployer le Backend sur Render

1. Va sur [dashboard.render.com](https://dashboard.render.com) → **New → Web Service**

2. Connecte ton dépôt GitHub `padel-analyzer`

3. Configure le service :
   | Champ | Valeur |
   |-------|--------|
   | **Name** | `padel-analyzer-backend` |
   | **Region** | `Frankfurt (EU)` |
   | **Branch** | `main` |
   | **Root Directory** | `backend` |
   | **Runtime** | `Node` |
   | **Build Command** | `npm install` |
   | **Start Command** | `npm start` |
   | **Plan** | `Free` |

4. Dans **Advanced → Add Disk** :
   | Champ | Valeur |
   |-------|--------|
   | **Name** | `padel-db` |
   | **Mount Path** | `/var/data` |
   | **Size** | `1 GB` |

   > ⚠️ Le disque persistant nécessite le plan **Starter ($7/mois)**. Sans disque, les données sont perdues à chaque redémarrage. Alternative gratuite : migrer vers PostgreSQL (Render offre une DB PostgreSQL gratuite).

5. Dans **Environment Variables**, ajoute :
   | Clé | Valeur |
   |-----|--------|
   | `NODE_ENV` | `production` |
   | `ANTHROPIC_API_KEY` | `sk-ant-...ta-clé...` |
   | `JWT_SECRET` | *(cliquer sur "Generate")* |
   | `FRONTEND_URL` | *(à remplir à l'étape 3)* |

6. Clique **Create Web Service** et attends le déploiement (~3 min)

7. **Copie l'URL** du service : `https://padel-analyzer-backend.onrender.com`

8. Teste : ouvre `https://padel-analyzer-backend.onrender.com/api/health`
   → Doit retourner `{"status":"ok","env":"production"}`

---

### ÉTAPE 3 — Déployer le Frontend sur Vercel

1. Va sur [vercel.com](https://vercel.com) → **Add New → Project**

2. Importe ton dépôt GitHub `padel-analyzer`

3. Configure le projet :
   | Champ | Valeur |
   |-------|--------|
   | **Framework Preset** | `Create React App` |
   | **Root Directory** | `frontend` |
   | **Build Command** | `npm run build` |
   | **Output Directory** | `build` |

4. Dans **Environment Variables**, ajoute :
   | Clé | Valeur |
   |-----|--------|
   | `REACT_APP_API_URL` | `https://padel-analyzer-backend.onrender.com` |

5. Clique **Deploy** et attends (~2 min)

6. **Copie l'URL** Vercel : `https://padel-analyzer.vercel.app`

---

### ÉTAPE 4 — Relier Backend et Frontend (CORS)

1. Retourne sur Render → ton service → **Environment**

2. Mets à jour la variable `FRONTEND_URL` avec l'URL Vercel :
   ```
   FRONTEND_URL = https://padel-analyzer.vercel.app
   ```

3. Render redémarre automatiquement le service

4. ✅ L'application est en ligne !

---

## 💻 Développement local

### Prérequis
- [Node.js 18+](https://nodejs.org)

### Installation

```bash
# Backend
cd backend
npm install
# Copier et configurer le .env
cp .env.example .env
# Éditer .env : ajouter ANTHROPIC_API_KEY

# Frontend (autre terminal)
cd frontend
npm install
```

### Lancement

```bash
# Terminal 1 — Backend (port 5000)
cd backend
npm run dev

# Terminal 2 — Frontend (port 3000)
cd frontend
npm start
```

→ Application sur **http://localhost:3000**

### Variables d'environnement (backend/.env)
```env
ANTHROPIC_API_KEY=sk-ant-...
JWT_SECRET=une_chaine_secrete_longue_et_aleatoire
PORT=5000
```

---

## 📁 Structure du projet

```
padel analyzer/
├── backend/
│   ├── server.js           ← Point d'entrée Express
│   ├── database.js         ← SQLite via sql.js + persistance fichier
│   ├── routes/
│   │   ├── auth.js         ← POST /api/auth/login|register
│   │   ├── matches.js      ← POST /api/matches (upload + analyse IA)
│   │   └── reports.js      ← GET /api/reports/:id
│   ├── middleware/auth.js  ← Vérification JWT
│   ├── render.yaml         ← Config déploiement Render
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── AuthPage.jsx      ← Connexion / Inscription
    │   │   ├── DashboardPage.jsx ← Tableau de bord
    │   │   ├── AnalysePage.jsx   ← Upload + formulaire analyse
    │   │   └── RapportPage.jsx   ← Rapport complet + export PDF
    │   └── context/AuthContext.jsx ← Auth + Axios global
    ├── vercel.json             ← Config déploiement Vercel
    └── .env.production.example
```

---

## ⚠️ Notes importantes

### SQLite sur Render Free
Le plan gratuit Render ne propose pas de disque persistant. Les données sont perdues à chaque redémarrage du service (environ toutes les 15 minutes d'inactivité).

**Solutions :**
- Plan **Starter Render** ($7/mois) → active le disque `/var/data`
- Migrer vers **PostgreSQL** (Render offre une DB PostgreSQL gratuite — demande si tu veux cette migration)

### Performances Render Free
Le backend "s'endort" après 15 min d'inactivité. La première requête prend ~30 secondes (cold start). C'est normal sur le plan gratuit.

### Clé API Anthropic
Ne jamais commiter la clé API dans le code. Elle doit toujours être définie comme variable d'environnement sur Render.
