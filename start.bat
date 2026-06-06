@echo off
echo ===========================================
echo         PADEL AI - Demarrage
echo ===========================================
echo.

REM Vérifier si Node.js est installé
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERREUR] Node.js n'est pas installe !
    echo Telecharge-le sur : https://nodejs.org
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js detecte
echo.

REM Installation si nécessaire
if not exist "backend\node_modules" (
    echo Installation des dependances backend...
    cd backend && npm install && cd ..
)
if not exist "frontend\node_modules" (
    echo Installation des dependances frontend...
    cd frontend && npm install && cd ..
)

echo.
echo Demarrage du backend (port 5000)...
start "Padel AI - Backend" cmd /k "cd backend && npm run dev"

echo Demarrage du frontend (port 3000)...
timeout /t 2 >nul
start "Padel AI - Frontend" cmd /k "cd frontend && npm start"

echo.
echo ===========================================
echo  Application disponible sur :
echo  http://localhost:3000
echo ===========================================
echo.
pause
