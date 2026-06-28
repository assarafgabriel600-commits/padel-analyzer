# BrevApp — Générateur de sujets de Brevet sur-mesure

Application iOS pour les élèves de 3ème préparant le Brevet des collèges.
L'élève décrit en langage naturel ce qu'il veut réviser ; l'app génère un sujet PDF personnalisé à partir de vraies annales officielles du DNB.

---

## Architecture

```
┌─────────────────┐       ┌──────────────────────────────────────────┐
│   App iOS       │◄─────►│ Backend FastAPI (Python)                 │
│   SwiftUI       │  HTTPS│                                          │
│                 │  SSE  │  /auth  → Supabase Auth                  │
│   Auth          │       │  /chat  → Claude (streaming SSE)         │
│   Chat          │       │  /subjects → CRUD sujets générés         │
│   PDF Viewer    │       │  /pipeline → scraping + extraction        │
└─────────────────┘       └──────────┬───────────────────────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    ▼                ▼                ▼
              Supabase          Celery Workers    Cloudflare R2
              (PostgreSQL       (Playwright       (Stockage PDF)
              + Auth)          scraper, PDF
                               extraction,
                               classification)
```

## Stack

| Couche | Technologie |
|--------|-------------|
| App iOS | SwiftUI (iOS 17+) |
| Backend | Python 3.12 / FastAPI |
| Auth | Supabase (email + mot de passe) |
| Base de données | Supabase PostgreSQL |
| File de tâches | Celery + Redis |
| Scraping | Playwright (headless Chromium) |
| Extraction PDF | pdfplumber + PyMuPDF |
| Classification | Claude API (claude-haiku) |
| Chatbot | Claude API (claude-sonnet, streaming SSE) |
| Génération PDF | PyMuPDF + ReportLab |
| Stockage PDF | Cloudflare R2 (compatible S3) |
| Hébergement backend | Render (Docker) |

## Sources de données

Uniquement des sites institutionnels officiels :

| Source | URL | Classification |
|--------|-----|----------------|
| Strabon | histoire.ac-versailles.fr/spip.php?rubrique128 | Déjà par thème ✅ |
| Eduscol | eduscol.education.gouv.fr/5202/ | Par Claude 🤖 |
| Education.gouv.fr | education.gouv.fr/reussir-au-lycee/... | Par Claude 🤖 |

## Structure du projet

```
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app
│   │   ├── config.py            # Settings (pydantic-settings)
│   │   ├── database.py          # Supabase client
│   │   ├── api/
│   │   │   ├── auth.py          # /auth/register|login|logout|me
│   │   │   ├── chat.py          # /chat/message (SSE streaming)
│   │   │   └── subjects.py      # /subjects CRUD + /pipeline
│   │   ├── services/
│   │   │   ├── scraper.py       # Playwright scraper (Strabon + Eduscol)
│   │   │   ├── extractor.py     # Segmentation PDF (pdfplumber + PyMuPDF)
│   │   │   ├── classifier.py    # Classification Claude
│   │   │   ├── generator.py     # Assemblage PDF final
│   │   │   └── search.py        # Recherche exercices en base
│   │   └── models/schemas.py    # Pydantic models
│   ├── workers/tasks.py         # Celery tasks
│   ├── migrations/001_schema.sql # Schéma Supabase
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── render.yaml              # Déploiement Render
│
└── ios/
    ├── project.yml              # XcodeGen config
    └── BrevApp/
        ├── Models/              # User, ChatMessage, GeneratedSubject
        ├── Services/            # APIService (SSE), AuthService (Keychain)
        ├── ViewModels/          # AuthVM, ChatVM, SubjectsVM
        └── Views/
            ├── Auth/            # Login + Register
            ├── Main/            # Tab bar, Home, Create, Account
            ├── Chat/            # ChatView + MessageBubble + TypingIndicator
            ├── PDF/             # PDFKit viewer + share
            └── Components/      # Cards, Buttons, Fields, Colors
```

## Démarrage rapide

### Backend

```bash
cd backend
cp .env.example .env
# Remplir les variables (Supabase, Anthropic, S3...)

# Dev avec Docker
docker compose up

# Ou directement
pip install -r requirements.txt
playwright install chromium
uvicorn app.main:app --reload
```

### Base de données

Dans le SQL Editor de Supabase, exécuter :
```
backend/migrations/001_schema.sql
```

### App iOS

```bash
cd ios
brew install xcodegen
xcodegen generate
open BrevApp.xcodeproj
# Cmd+R pour lancer sur simulateur
```

### Premier peuplement de la base

```bash
# Via l'API (une fois le backend démarré)
curl -X POST http://localhost:8000/pipeline/scrape \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"source": "strabon", "limit": 50}'
```

## Déploiement production (Render)

Le fichier `backend/render.yaml` configure automatiquement :
- Service API (Docker)
- Worker Celery (Docker)
- Redis managé

Pousser sur la branche principale après avoir configuré les variables d'environnement dans le dashboard Render.
