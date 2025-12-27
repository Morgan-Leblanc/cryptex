// Cryptex Game - Backend Server
// Run with: node server.cjs

const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ============================================
// CONFIGURATION DES MANCHES PAR DÉFAUT
// ============================================
const DEFAULT_ROUNDS = [
  { 
    id: 1, name: "L'Éveil", solution: 'AURORE', difficulty: 'Facile', 
    question: "Le moment où le soleil se lève et peint le ciel de couleurs chaudes...",
    hints: ["C'est un moment de la journée", "Ça commence par un A", "6 lettres, synonyme de lever du jour"]
  },
  { 
    id: 2, name: 'Le Mystère', solution: 'ENIGME', difficulty: 'Moyen', 
    question: "Une question sans réponse évidente, un puzzle pour l'esprit...",
    hints: ["Un casse-tête intellectuel", "Ça commence par un E", "Souvent posée par le Sphinx"]
  },
  { 
    id: 3, name: 'La Quête', solution: 'TRESOR', difficulty: 'Moyen', 
    question: "Ce que les pirates cherchaient au bout de la carte...",
    hints: ["Souvent enterré", "Ça commence par un T", "Coffre rempli d'or"]
  },
  { 
    id: 4, name: 'Le Savoir', solution: 'ESPRIT', difficulty: 'Difficile', 
    question: "Le siège de la pensée, là où naissent les idées...",
    hints: ["Lié à l'intelligence", "Ça commence par un E", "L'âme et le corps, et..."]
  },
  { 
    id: 5, name: 'Le Pouvoir', solution: 'FORCES', difficulty: 'Difficile', 
    question: "Ce qui permet de déplacer des montagnes, au pluriel...",
    hints: ["C'est au pluriel", "Ça commence par un F", "L'armée en a beaucoup"]
  },
  { 
    id: 6, name: "L'Ultime", solution: 'VAINCU', difficulty: 'Expert', 
    question: "L'état de celui qui a perdu la bataille finale...",
    hints: ["Le contraire de vainqueur", "Ça commence par un V", "Participe passé"]
  },
];

// ============================================
// ÉTAT DU JEU (en mémoire)
// ============================================
let gameState = {
  id: `game_${Date.now()}`,
  rounds: JSON.parse(JSON.stringify(DEFAULT_ROUNDS)),
  isStarted: false,
  startedAt: null,
  createdAt: new Date().toISOString(),
  // Mode de jeu: "free" (chacun son rythme) ou "controlled" (admin contrôle les manches)
  gameMode: 'free',
  // Pour le mode contrôlé
  currentRound: 0,        // 0 = pas encore de manche, 1-6 = manche en cours
  roundActive: false,     // La manche est-elle jouable?
  roundWinners: [],       // Joueurs qui ont trouvé la manche actuelle
  // Indices révélés par manche (0-3 pour chaque manche)
  revealedHints: [0, 0, 0, 0, 0, 0],
};

// ============================================
// JOUEURS ET LEURS PROGRESSIONS
// ============================================
let players = {};

// Structure d'un joueur
function createPlayer(username) {
  return {
    username,
    joinedAt: new Date().toISOString(),
    currentRound: 0, // 0-indexed, 0 = round 1
    roundsCompleted: [false, false, false, false, false, false],
    roundTimes: [0, 0, 0, 0, 0, 0],
    isFinished: false,
    finishedAt: null,
    roundStartTime: null,
    // Pour le mode contrôlé: a trouvé la manche actuelle?
    hasFoundCurrentRound: false,
  };
}

// ============================================
// HELPERS
// ============================================
function getPlayersForAPI() {
  return Object.values(players).map(p => ({
    username: p.username,
    currentRound: gameState.gameMode === 'controlled' ? gameState.currentRound : p.currentRound + 1,
    isFinished: p.isFinished,
    roundsCompleted: p.roundsCompleted.filter(Boolean).length,
    hasFoundCurrentRound: p.hasFoundCurrentRound,
  }));
}

function getLeaderboard() {
  return Object.values(players)
    .sort((a, b) => {
      if (a.isFinished !== b.isFinished) return b.isFinished - a.isFinished;
      const aCompleted = a.roundsCompleted.filter(Boolean).length;
      const bCompleted = b.roundsCompleted.filter(Boolean).length;
      if (aCompleted !== bCompleted) return bCompleted - aCompleted;
      const aTime = a.roundTimes.reduce((sum, t) => sum + t, 0);
      const bTime = b.roundTimes.reduce((sum, t) => sum + t, 0);
      return aTime - bTime;
    })
    .map((p, index) => ({
      rank: index + 1,
      username: p.username,
      roundsCompleted: p.roundsCompleted.filter(Boolean).length,
      isFinished: p.isFinished,
      totalTime: p.roundTimes.reduce((sum, t) => sum + t, 0),
      hasFoundCurrentRound: p.hasFoundCurrentRound,
    }));
}

function getRoundWinners() {
  return gameState.roundWinners.map(username => {
    const player = players[username];
    const roundIndex = gameState.currentRound - 1;
    return {
      username,
      time: player ? player.roundTimes[roundIndex] : 0,
    };
  }).sort((a, b) => a.time - b.time);
}

// ============================================
// ENDPOINTS
// ============================================

// GET /api/game - Récupérer l'état du jeu
app.get('/api/game', (req, res) => {
  const { admin } = req.query;
  
  const response = {
    id: gameState.id,
    isStarted: gameState.isStarted,
    startedAt: gameState.startedAt,
    createdAt: gameState.createdAt,
    gameMode: gameState.gameMode,
    currentRound: gameState.currentRound,
    roundActive: gameState.roundActive,
    connectedPlayers: Object.keys(players),
    playerCount: Object.keys(players).length,
  };

  if (admin === 'true') {
    response.rounds = gameState.rounds;
    response.players = getPlayersForAPI();
    response.leaderboard = getLeaderboard();
    response.roundWinners = getRoundWinners();
    response.totalWinners = gameState.roundWinners.length;
    return res.json(response);
  }

  // Joueurs: sans les solutions, mais avec les indices révélés
  response.rounds = gameState.rounds.map((r, index) => {
    const hintsCount = gameState.revealedHints[index] || 0;
    return {
      id: r.id,
      name: r.name,
      difficulty: r.difficulty,
      question: r.question,
      // Ne renvoyer que les indices déjà révélés
      hints: r.hints ? r.hints.slice(0, hintsCount) : [],
      totalHints: r.hints ? r.hints.length : 0,
      revealedHints: hintsCount,
    };
  });
  response.revealedHints = gameState.revealedHints;
  
  return res.json(response);
});

// GET /api/game/player/:username - Récupérer la progression d'un joueur
app.get('/api/game/player/:username', (req, res) => {
  const { username } = req.params;
  const player = players[username];
  
  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }

  return res.json({
    username: player.username,
    currentRound: gameState.gameMode === 'controlled' ? gameState.currentRound : player.currentRound,
    roundsCompleted: player.roundsCompleted,
    isFinished: player.isFinished,
    hasFoundCurrentRound: player.hasFoundCurrentRound,
    gameMode: gameState.gameMode,
    roundActive: gameState.roundActive,
  });
});

// GET /api/game/leaderboard
app.get('/api/game/leaderboard', (req, res) => {
  return res.json({
    leaderboard: getLeaderboard(),
    gameStarted: gameState.isStarted,
    gameMode: gameState.gameMode,
    currentRound: gameState.currentRound,
    totalPlayers: Object.keys(players).length,
  });
});

// POST /api/game - Actions
app.post('/api/game', (req, res) => {
  const { action } = req.query;

  switch (action) {
    // ========== ADMIN ACTIONS ==========
    
    // Changer le mode de jeu
    case 'set-mode': {
      const { mode } = req.body;
      if (!['free', 'controlled'].includes(mode)) {
        return res.status(400).json({ error: 'Invalid mode. Use "free" or "controlled"' });
      }
      gameState.gameMode = mode;
      console.log(`🎮 Game mode set to: ${mode}`);
      return res.json({ success: true, gameMode: mode });
    }

    // Démarrer le jeu
    case 'start': {
      if (gameState.isStarted) {
        return res.status(400).json({ error: 'Game already started' });
      }
      gameState.isStarted = true;
      gameState.startedAt = new Date().toISOString();
      
      if (gameState.gameMode === 'free') {
        // Mode libre: tous les joueurs commencent immédiatement
        const now = Date.now();
        Object.values(players).forEach(p => {
          p.roundStartTime = now;
          p.currentRound = 0;
        });
        console.log('🎮 Game STARTED in FREE mode!');
      } else {
        // Mode contrôlé: on attend que l'admin lance la première manche
        gameState.currentRound = 0;
        gameState.roundActive = false;
        gameState.roundWinners = [];
        console.log('🎮 Game STARTED in CONTROLLED mode! Waiting for admin to launch round 1...');
      }
      
      return res.json({ success: true, game: gameState });
    }

    // Lancer la prochaine manche (mode contrôlé uniquement)
    case 'launch-round': {
      if (gameState.gameMode !== 'controlled') {
        return res.status(400).json({ error: 'Only available in controlled mode' });
      }
      if (!gameState.isStarted) {
        return res.status(400).json({ error: 'Game not started' });
      }

      const nextRound = gameState.currentRound + 1;
      if (nextRound > 6) {
        return res.status(400).json({ error: 'All rounds completed' });
      }

      gameState.currentRound = nextRound;
      gameState.roundActive = true;
      gameState.roundWinners = [];
      
      // Réinitialiser le statut "trouvé" pour tous les joueurs
      const now = Date.now();
      Object.values(players).forEach(p => {
        p.hasFoundCurrentRound = false;
        p.roundStartTime = now;
      });

      console.log(`🚀 Round ${nextRound} LAUNCHED!`);
      return res.json({ 
        success: true, 
        currentRound: nextRound,
        roundActive: true,
      });
    }

    // Terminer la manche actuelle (mode contrôlé)
    case 'end-round': {
      if (gameState.gameMode !== 'controlled') {
        return res.status(400).json({ error: 'Only available in controlled mode' });
      }
      
      gameState.roundActive = false;
      console.log(`⏹️ Round ${gameState.currentRound} ended by admin`);
      
      // Vérifier si c'était la dernière manche
      if (gameState.currentRound >= 6) {
        // Marquer tous les joueurs qui ont complété les 6 manches comme terminés
        Object.values(players).forEach(p => {
          if (p.roundsCompleted.every(Boolean)) {
            p.isFinished = true;
            p.finishedAt = new Date().toISOString();
          }
        });
      }
      
      return res.json({ 
        success: true, 
        roundActive: false,
        winners: getRoundWinners(),
      });
    }

    // Révéler un indice pour une manche
    case 'reveal-hint': {
      const { roundId } = req.body;
      
      if (!roundId) {
        return res.status(400).json({ error: 'roundId required' });
      }
      
      const roundIndex = roundId - 1;
      if (roundIndex < 0 || roundIndex >= 6) {
        return res.status(400).json({ error: 'Invalid round' });
      }
      
      const round = gameState.rounds[roundIndex];
      const currentHints = gameState.revealedHints[roundIndex];
      
      if (currentHints >= 3) {
        return res.status(400).json({ error: 'All hints already revealed' });
      }
      
      if (!round.hints || round.hints.length <= currentHints) {
        return res.status(400).json({ error: 'No more hints available' });
      }
      
      gameState.revealedHints[roundIndex] = currentHints + 1;
      
      console.log(`💡 Hint ${currentHints + 1} revealed for round ${roundId}`);
      
      return res.json({ 
        success: true, 
        roundId,
        hintsRevealed: gameState.revealedHints[roundIndex],
        hint: round.hints[currentHints],
      });
    }

    case 'stop': {
      gameState.isStarted = false;
      gameState.roundActive = false;
      console.log('⏹️ Game STOPPED');
      return res.json({ success: true, game: gameState });
    }

    case 'reset': {
      gameState = {
        id: `game_${Date.now()}`,
        rounds: JSON.parse(JSON.stringify(DEFAULT_ROUNDS)),
        isStarted: false,
        startedAt: null,
        createdAt: new Date().toISOString(),
        gameMode: gameState.gameMode, // Garder le mode
        currentRound: 0,
        roundActive: false,
        roundWinners: [],
        revealedHints: [0, 0, 0, 0, 0, 0],
      };
      players = {};
      console.log('🔄 Game RESET');
      return res.json({ success: true, game: gameState });
    }

    // ========== PLAYER ACTIONS ==========
    case 'join': {
      const { username } = req.body;
      if (!username) {
        return res.status(400).json({ error: 'Username required' });
      }
      
      if (!players[username]) {
        players[username] = createPlayer(username);
        console.log(`👤 Player joined: ${username} (total: ${Object.keys(players).length})`);
      } else {
        console.log(`👤 Player reconnected: ${username}`);
      }
      
      return res.json({ 
        success: true, 
        player: players[username],
        game: {
          isStarted: gameState.isStarted,
          gameMode: gameState.gameMode,
          currentRound: gameState.currentRound,
          roundActive: gameState.roundActive,
          connectedPlayers: Object.keys(players),
        }
      });
    }

    case 'leave': {
      const { username: leaveUser } = req.body;
      if (leaveUser && players[leaveUser]) {
        delete players[leaveUser];
        gameState.roundWinners = gameState.roundWinners.filter(u => u !== leaveUser);
        console.log(`👋 Player left: ${leaveUser} (remaining: ${Object.keys(players).length})`);
      }
      return res.json({ success: true });
    }

    // Vérifier une solution
    case 'check': {
      const { username, roundId, solution } = req.body;
      
      if (!roundId || !solution) {
        return res.status(400).json({ error: 'roundId and solution required' });
      }

      // En mode contrôlé, vérifier que c'est la bonne manche et qu'elle est active
      if (gameState.gameMode === 'controlled') {
        if (roundId !== gameState.currentRound) {
          return res.status(400).json({ error: 'Not the current round' });
        }
        if (!gameState.roundActive) {
          return res.status(400).json({ error: 'Round not active yet' });
        }
      }
      
      const round = gameState.rounds.find(r => r.id === roundId);
      if (!round) {
        return res.status(404).json({ error: 'Round not found' });
      }

      const isCorrect = solution?.toUpperCase() === round.solution;
      console.log(`🔍 ${username || 'Anonymous'} - Round ${roundId}: ${solution} -> ${isCorrect ? '✅' : '❌'}`);
      
      return res.json({ 
        correct: isCorrect,
        solution: isCorrect ? round.solution : undefined,
      });
    }

    // Valider un round (enregistrer la victoire)
    case 'complete-round': {
      const { username, roundId, timeSeconds } = req.body;
      
      if (!username || roundId === undefined) {
        return res.status(400).json({ error: 'username and roundId required' });
      }
      
      const player = players[username];
      if (!player) {
        return res.status(404).json({ error: 'Player not found' });
      }
      
      const roundIndex = roundId - 1;
      if (roundIndex < 0 || roundIndex >= 6) {
        return res.status(400).json({ error: 'Invalid round' });
      }

      // Calculer le temps
      const time = timeSeconds || (player.roundStartTime 
        ? Math.round((Date.now() - player.roundStartTime) / 1000)
        : 60);
      
      // Mettre à jour le joueur
      player.roundsCompleted[roundIndex] = true;
      player.roundTimes[roundIndex] = time;

      if (gameState.gameMode === 'controlled') {
        // Mode contrôlé: marquer comme trouvé, mais ne pas passer à la manche suivante
        player.hasFoundCurrentRound = true;
        if (!gameState.roundWinners.includes(username)) {
          gameState.roundWinners.push(username);
        }
        console.log(`🎉 ${username} found round ${roundId} in ${time}s! (${gameState.roundWinners.length} winners)`);
        
        return res.json({
          success: true,
          isFinished: false,
          waitingForNextRound: true,
          position: gameState.roundWinners.indexOf(username) + 1,
          leaderboard: getLeaderboard().slice(0, 5),
        });
      } else {
        // Mode libre: passer au round suivant ou terminer
        const allCompleted = player.roundsCompleted.every(Boolean);
        if (allCompleted) {
          player.isFinished = true;
          player.finishedAt = new Date().toISOString();
          console.log(`🏆 ${username} FINISHED!`);
        } else {
          player.currentRound = roundIndex + 1;
          player.roundStartTime = Date.now();
          console.log(`✅ ${username} completed round ${roundId}`);
        }
        
        return res.json({
          success: true,
          isFinished: player.isFinished,
          nextRound: player.isFinished ? null : player.currentRound + 1,
          leaderboard: getLeaderboard().slice(0, 5),
        });
      }
    }

    default:
      return res.status(400).json({ error: 'Invalid action' });
  }
});

// PUT /api/game - Mettre à jour la config d'une manche (admin)
app.put('/api/game', (req, res) => {
  const { roundId, updates } = req.body;
  
  if (!roundId || !updates) {
    return res.status(400).json({ error: 'roundId and updates required' });
  }

  const roundIndex = gameState.rounds.findIndex(r => r.id === roundId);
  if (roundIndex === -1) {
    return res.status(404).json({ error: 'Round not found' });
  }

  if (updates.solution) {
    updates.solution = updates.solution.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6).padEnd(6, 'A');
  }

  gameState.rounds[roundIndex] = {
    ...gameState.rounds[roundIndex],
    ...updates,
  };

  console.log(`✏️ Round ${roundId} updated:`, updates);
  return res.json({ success: true, round: gameState.rounds[roundIndex] });
});

// ============================================
// DÉMARRAGE DU SERVEUR
// ============================================
const PORT = 3001;
app.listen(PORT, () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║           🔐 CRYPTEX GAME - Backend Server                ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log(`║  Server: http://localhost:${PORT}                             ║`);
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
});
