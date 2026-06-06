# ============================================================
#  DEPLOIEMENT FRONTEND — VERCEL CLI
#  Exécuter depuis : C:\Users\PC\Desktop\padel analyzer\
# ============================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   PADEL AI — Deploiement Frontend Vercel" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# 1. Vérifier Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "[ERREUR] Node.js n'est pas installe." -ForegroundColor Red
  exit 1
}

# 2. Aller dans le dossier frontend
$frontendPath = Join-Path $PSScriptRoot "frontend"
Set-Location $frontendPath
Write-Host "[1/4] Dossier frontend : $frontendPath" -ForegroundColor Green

# 3. S'assurer que les deps sont installees
if (-not (Test-Path "node_modules")) {
  Write-Host "[2/4] Installation des dependances..." -ForegroundColor Yellow
  npm install
} else {
  Write-Host "[2/4] Dependances deja installees." -ForegroundColor Green
}

# 4. Build de production
Write-Host "[3/4] Build de production React..." -ForegroundColor Yellow
npm run build
Write-Host "      Build OK" -ForegroundColor Green

# 5. Deploiement Vercel
Write-Host ""
Write-Host "[4/4] Deploiement sur Vercel..." -ForegroundColor Yellow
Write-Host ""
Write-Host "-> Si c'est la premiere fois, Vercel va vous demander de vous connecter." -ForegroundColor White
Write-Host "   Suivez les instructions dans le navigateur." -ForegroundColor White
Write-Host ""
Write-Host "   REPONSES SUGGERIES aux questions Vercel :" -ForegroundColor Cyan
Write-Host "   Set up and deploy? -> Y" -ForegroundColor Cyan
Write-Host "   Which scope?       -> Votre compte personnel" -ForegroundColor Cyan
Write-Host "   Link to existing?  -> N" -ForegroundColor Cyan
Write-Host "   Project name?      -> padel-analyzer (ou Entree)" -ForegroundColor Cyan
Write-Host "   Directory?         -> ./ (Entree)" -ForegroundColor Cyan
Write-Host "   Override settings? -> N" -ForegroundColor Cyan
Write-Host ""

# Vercel deploy en production
npx vercel --prod

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host " Frontend deploye sur Vercel !" -ForegroundColor Green
Write-Host " Copiez l'URL .vercel.app affichee ci-dessus" -ForegroundColor Green
Write-Host " puis renseignez-la dans le script backend." -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
