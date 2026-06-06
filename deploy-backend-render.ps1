# ============================================================
#  DEPLOIEMENT BACKEND — RENDER (via API + GitLab auto)
#  Exécuter depuis : C:\Users\PC\Desktop\padel analyzer\
# ============================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   PADEL AI — Deploiement Backend Render" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ── CONFIGURATION ─────────────────────────────────────────
Write-Host "ETAPE 1/5 — Configuration" -ForegroundColor Yellow
Write-Host ""
Write-Host "Obtenez vos tokens ici :" -ForegroundColor White
Write-Host "  GitLab  : https://gitlab.com/-/user_settings/personal_access_tokens" -ForegroundColor Cyan
Write-Host "            (Scopes requis : api, read_repository, write_repository)" -ForegroundColor Gray
Write-Host "  Render  : https://dashboard.render.com/u/settings#api-keys" -ForegroundColor Cyan
Write-Host "  Anthropic: https://console.anthropic.com/settings/keys" -ForegroundColor Cyan
Write-Host ""

$GITLAB_TOKEN     = Read-Host "Votre token GitLab (glpat-...)"
$GITLAB_USERNAME  = Read-Host "Votre nom d'utilisateur GitLab"
$RENDER_API_KEY   = Read-Host "Votre cle API Render"
$ANTHROPIC_KEY    = Read-Host "Votre cle API Anthropic (sk-ant-...)"
$FRONTEND_URL     = Read-Host "URL Vercel du frontend (ex: https://padel-analyzer.vercel.app)"

$REPO_NAME = "padel-analyzer-backend"
$backendPath = Join-Path $PSScriptRoot "backend"

# ── ETAPE 2 : Créer le repo GitLab ────────────────────────
Write-Host ""
Write-Host "ETAPE 2/5 — Creation du repo GitLab prive..." -ForegroundColor Yellow

$headers = @{
  "PRIVATE-TOKEN" = $GITLAB_TOKEN
  "Content-Type"  = "application/json"
}

$repoBody = @{
  name       = $REPO_NAME
  visibility = "private"
  description = "Padel AI Backend"
} | ConvertTo-Json

try {
  $repo = Invoke-RestMethod `
    -Uri "https://gitlab.com/api/v4/projects" `
    -Method POST `
    -Headers $headers `
    -Body $repoBody
  $GITLAB_REPO_URL = $repo.http_url_to_repo
  $GITLAB_REPO_ID  = $repo.id
  Write-Host "   Repo cree : $GITLAB_REPO_URL" -ForegroundColor Green
} catch {
  # Le repo existe peut-etre deja
  $existing = Invoke-RestMethod `
    -Uri "https://gitlab.com/api/v4/projects?search=$REPO_NAME&owned=true" `
    -Headers $headers
  $found = $existing | Where-Object { $_.name -eq $REPO_NAME } | Select-Object -First 1
  if ($found) {
    $GITLAB_REPO_URL = $found.http_url_to_repo
    $GITLAB_REPO_ID  = $found.id
    Write-Host "   Repo existant utilise : $GITLAB_REPO_URL" -ForegroundColor Cyan
  } else {
    Write-Host "[ERREUR] Impossible de creer/trouver le repo GitLab." -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
  }
}

# ── ETAPE 3 : Push du code backend vers GitLab ────────────
Write-Host ""
Write-Host "ETAPE 3/5 — Push du code vers GitLab..." -ForegroundColor Yellow

Set-Location $backendPath

# Initialiser git si nécessaire
if (-not (Test-Path ".git")) {
  git init
  git branch -M main
}

# Configurer le remote avec token dans l'URL (auth automatique)
$repoWithAuth = $GITLAB_REPO_URL -replace "https://", "https://oauth2:$GITLAB_TOKEN@"
git remote remove gitlab 2>$null
git remote add gitlab $repoWithAuth

# Créer un .gitignore propre
@"
node_modules/
.env
*.db
uploads/
"@ | Set-Content ".gitignore" -Encoding utf8

git add --all
git commit -m "Deploy: Padel AI Backend" --allow-empty 2>$null

git push --force gitlab main

Write-Host "   Code pousse sur GitLab." -ForegroundColor Green

# ── ETAPE 4 : Créer le service Render via API ─────────────
Write-Host ""
Write-Host "ETAPE 4/5 — Creation du service Render..." -ForegroundColor Yellow

$renderHeaders = @{
  "Authorization" = "Bearer $RENDER_API_KEY"
  "Content-Type"  = "application/json"
}

# D'abord créer/connecter le repo GitLab dans Render
$serviceBody = @{
  type        = "web_service"
  name        = "padel-analyzer-backend"
  repo        = $GITLAB_REPO_URL
  branch      = "main"
  autoDeploy  = "yes"
  serviceDetails = @{
    env             = "node"
    region          = "frankfurt"
    plan            = "free"
    buildCommand    = "npm install"
    startCommand    = "npm start"
    envVars = @(
      @{ key = "NODE_ENV";        value = "production" },
      @{ key = "ANTHROPIC_API_KEY"; value = $ANTHROPIC_KEY },
      @{ key = "FRONTEND_URL";    value = $FRONTEND_URL },
      @{ key = "JWT_SECRET";      generateValue = $true }
    )
  }
} | ConvertTo-Json -Depth 10

try {
  $service = Invoke-RestMethod `
    -Uri "https://api.render.com/v1/services" `
    -Method POST `
    -Headers $renderHeaders `
    -Body $serviceBody

  $SERVICE_ID  = $service.service.id
  $SERVICE_URL = "https://$($service.service.serviceDetails.url)"
  Write-Host "   Service cree ! ID : $SERVICE_ID" -ForegroundColor Green
  Write-Host "   URL : $SERVICE_URL" -ForegroundColor Green
} catch {
  Write-Host "[ATTENTION] Erreur creation service Render :" -ForegroundColor Yellow
  Write-Host $_.Exception.Message -ForegroundColor Red
  Write-Host ""
  Write-Host "Render necessite souvent de connecter GitLab manuellement la premiere fois." -ForegroundColor Yellow
  Write-Host "Ouvrez : https://dashboard.render.com/select-repo" -ForegroundColor Cyan
  Write-Host "  -> Connect account -> GitLab -> Selectionnez '$REPO_NAME'" -ForegroundColor Cyan
  Write-Host "  -> Build: 'npm install' | Start: 'npm start'" -ForegroundColor Cyan
  Write-Host "  -> Variables :" -ForegroundColor Cyan
  Write-Host "     NODE_ENV         = production" -ForegroundColor White
  Write-Host "     ANTHROPIC_API_KEY = $($ANTHROPIC_KEY.Substring(0,20))..." -ForegroundColor White
  Write-Host "     FRONTEND_URL     = $FRONTEND_URL" -ForegroundColor White
  Write-Host "     JWT_SECRET       = (Generate)" -ForegroundColor White
  $SERVICE_URL = "https://padel-analyzer-backend.onrender.com"
}

# ── ETAPE 5 : Mettre à jour REACT_APP_API_URL sur Vercel ──
Write-Host ""
Write-Host "ETAPE 5/5 — Configuration finale..." -ForegroundColor Yellow
Write-Host ""
Write-Host "   Backend Render : $SERVICE_URL" -ForegroundColor Green
Write-Host ""
Write-Host "   Pour lier le frontend, ajoutez cette variable sur Vercel :" -ForegroundColor White
Write-Host "   https://vercel.com/dashboard -> votre projet -> Settings -> Environment Variables" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Cle   : REACT_APP_API_URL" -ForegroundColor White
Write-Host "   Valeur: $SERVICE_URL" -ForegroundColor Green
Write-Host ""
Write-Host "   Puis : Vercel -> Deployments -> Redeploy (pour appliquer la variable)" -ForegroundColor Yellow

# Sauvegarder les URLs dans un fichier pour référence
@"
# URLs de deploiement Padel AI
BACKEND_URL=$SERVICE_URL
FRONTEND_URL=$FRONTEND_URL
GITLAB_REPO=$GITLAB_REPO_URL
"@ | Set-Content (Join-Path $PSScriptRoot "deployment-urls.txt") -Encoding utf8

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host " URLs sauvegardees dans deployment-urls.txt" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
