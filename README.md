# 🔐 Cryptex - Le Jeu des Mystères

Un jeu de puzzle unique basé sur le concept du Cryptex de Léonard de Vinci, composé de 6 manches progressives.

## 🎮 Concept du Jeu

Le Cryptex est un dispositif cylindrique composé de 6 roues rotatives avec des lettres. Le but est de trouver le bon alignement de lettres pour résoudre chaque manche.

### Fonctionnalités

- **Code d'accès** : Entrez le code `2026` pour accéder au jeu
- **Mode Admin** : Connectez-vous avec `admin2026` pour gérer la partie
- **Multijoueur synchronisé** : Tous les joueurs voient les mêmes mises à jour en temps réel
- **6 Manches progressives** : De facile à expert, toutes avec 6 lettres
- **Interface Cryptex réaliste** : Design inspiré du Cryptex de Da Vinci
- **Mobile-first** : Optimisé pour les écrans tactiles

## 🚀 Démarrage Rapide

### Installation

```bash
npm install
```

### Développement Local

Pour lancer le frontend ET le backend en parallèle :

```bash
npm run dev:full
```

Ou séparément :

```bash
# Terminal 1 - Backend (port 3001)
npm run server

# Terminal 2 - Frontend (port 3000)
npm run dev
```

Puis ouvrez http://localhost:3000

### Build Production

```bash
npm run build
```

## 🎯 Comment Jouer

### En tant que Joueur

1. Entrez le code `2026`
2. Entrez votre nom d'utilisateur
3. Attendez que l'admin lance la partie
4. Faites glisser les roues pour former le mot
5. Validez votre réponse

### En tant qu'Admin

1. Entrez le code `2026`
2. Connectez-vous avec `admin2026`
3. Configurez les manches (mots, indices)
4. Cliquez sur "Lancer la Partie" quand tous les joueurs sont connectés
5. Suivez la progression des joueurs

## 🏗️ Architecture

```
cryptex-game/
├── api/                    # Vercel Serverless Functions
│   ├── game.ts             # API principale (état de jeu, joueurs, rounds)
│   ├── sessions.ts         # Gestion des sessions
│   ├── validate-code.ts    # Validation du code d'accès
│   └── leaderboard.ts      # Classement
├── src/
│   ├── components/
│   │   ├── AdminPanel.tsx  # Panel d'administration
│   │   ├── CodeEntry.tsx   # Saisie du code 2026
│   │   ├── CryptexGame.tsx # Jeu principal
│   │   ├── CryptexWheel.tsx# Roue du cryptex
│   │   ├── Login.tsx       # Connexion utilisateur
│   │   ├── Victory.tsx     # Écran de victoire
│   │   └── WaitingRoom.tsx # Salle d'attente
│   ├── stores/
│   │   ├── adminStore.ts   # État admin (Zustand)
│   │   └── gameStore.ts    # État joueur (Zustand)
│   └── types/
│       └── index.ts        # Types TypeScript
├── server.js               # Serveur Express pour dev local
├── vercel.json             # Config Vercel
└── package.json
```

## 🚀 Déploiement sur Vercel

1. Connectez votre repo à Vercel
2. Vercel détectera automatiquement la configuration
3. Les API routes dans `/api` seront automatiquement déployées

```bash
npx vercel
```

## 🔄 Synchronisation Temps Réel

L'application utilise un système de **polling** (toutes les 2 secondes) pour synchroniser :

- Liste des joueurs connectés
- État de la partie (en attente / en cours)
- Configuration des manches

## 🎨 Technologies

- **React 18** + TypeScript
- **Vite** - Build tool
- **Tailwind CSS v4** - Styling
- **Framer Motion** - Animations
- **Zustand** - State management
- **Express** - Backend dev local
- **Vercel** - Déploiement production

## 📝 Solutions par défaut

| Manche | Nom | Solution | Difficulté |
|--------|-----|----------|------------|
| 1 | L'Éveil | AURORE | Facile |
| 2 | Le Mystère | ENIGME | Moyen |
| 3 | La Quête | TRESOR | Moyen |
| 4 | Le Savoir | ESPRIT | Difficile |
| 5 | Le Pouvoir | FORCES | Difficile |
| 6 | L'Ultime | VAINCU | Expert |

> L'admin peut modifier ces solutions dans le panel d'administration.

## 📄 License

MIT
