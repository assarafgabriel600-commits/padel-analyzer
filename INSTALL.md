# Installation de Padel Analyzer

## Prérequis

1. **Installer Node.js** : https://nodejs.org (version 18 ou supérieure)
   - Télécharge et installe Node.js LTS
   - Redémarre le terminal après installation

## Installation

### Backend
```bash
cd backend
npm install
```

### Frontend
```bash
cd frontend
npm install
```

## Configuration

1. Copie `backend/.env.example` vers `backend/.env`
2. Remplace `your_anthropic_api_key_here` par ta vraie clé API Anthropic
   - Obtiens ta clé sur : https://console.anthropic.com

## Lancement

### Backend (terminal 1)
```bash
cd backend
npm run dev
```

### Frontend (terminal 2)
```bash
cd frontend
npm start
```

L'application sera disponible sur : http://localhost:3000
