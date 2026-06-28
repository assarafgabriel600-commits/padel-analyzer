# BrevApp iOS

## Setup

### Prérequis
- Xcode 15.4+
- XcodeGen (`brew install xcodegen`)
- Un compte Apple Developer (pour signer l'app)

### Générer le projet Xcode

```bash
cd ios
xcodegen generate
open BrevApp.xcodeproj
```

### Configuration

Ouvre `BrevApp/Services/APIService.swift` et change `baseURL` vers ton URL de backend déployé.

Ou utilise une variable d'environnement dans le schéma Xcode :
- `API_BASE_URL` = `https://your-api.onrender.com`

### Build & Run
1. Sélectionne un simulateur iPhone (iOS 17+)
2. Cmd+R pour lancer

### Déploiement App Store
1. Remplis `DEVELOPMENT_TEAM` dans `project.yml`
2. Régénère le projet : `xcodegen generate`
3. Archive dans Xcode (Product → Archive)
4. Distribue via App Store Connect
