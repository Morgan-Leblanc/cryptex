// Simple Express server for local development
// Run with: node server.js

const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Game state (in-memory)
const DEFAULT_ROUNDS = [
  { id: 1, name: "L'Éveil", solution: 'AURORE', hint: "Le moment où le jour se lève sur l'horizon...", difficulty: 'Facile' },
  { id: 2, name: 'Le Mystère', solution: 'ENIGME', hint: 'Une question qui défie la logique...', difficulty: 'Moyen' },
  { id: 3, name: 'La Quête', solution: 'TRESOR', hint: 'Ce que les aventuriers cherchent...', difficulty: 'Moyen' },
  { id: 4, name: 'Le Savoir', solution: 'ESPRIT', hint: 'Le siège de la pensée humaine...', difficulty: 'Difficile' },
  { id: 5, name: 'Le Pouvoir', solution: 'FORCES', hint: "Ce qui donne la capacité d'agir...", difficulty: 'Difficile' },
  { id: 6, name: "L'Ultime", solution: 'VAINCU', hint: "L'état de celui qui a perdu le combat...", difficulty: 'Expert' },
];

let gameState = {
  id: `game_${Date.now()}`,
  rounds: JSON.parse(JSON.stringify(DEFAULT_ROUNDS)),
  isStarted: false,
  startedAt: null,
  createdAt: new Date().toISOString(),
  connectedPlayers: [],
};

// GET /api/game
app.get('/api/game', (req, res) => {
  const { admin } = req.query;
  
  if (admin === 'true') {
    return res.json(gameState);
  }

  // Return state without solutions for non-admin
  const publicState = {
    ...gameState,
    rounds: gameState.rounds.map(r => ({
      id: r.id,
      name: r.name,
      hint: r.hint,
      difficulty: r.difficulty,
    })),
  };
  return res.json(publicState);
});

// POST /api/game
app.post('/api/game', (req, res) => {
  const { action } = req.query;

  switch (action) {
    case 'start':
      if (gameState.isStarted) {
        return res.status(400).json({ error: 'Game already started' });
      }
      gameState.isStarted = true;
      gameState.startedAt = new Date().toISOString();
      console.log('🎮 Game STARTED!');
      return res.json({ success: true, game: gameState });

    case 'stop':
      gameState.isStarted = false;
      console.log('⏹️ Game STOPPED');
      return res.json({ success: true, game: gameState });

    case 'reset':
      gameState = {
        id: `game_${Date.now()}`,
        rounds: JSON.parse(JSON.stringify(DEFAULT_ROUNDS)),
        isStarted: false,
        startedAt: null,
        createdAt: new Date().toISOString(),
        connectedPlayers: [],
      };
      console.log('🔄 Game RESET');
      return res.json({ success: true, game: gameState });

    case 'join':
      const { username } = req.body;
      if (!username) {
        return res.status(400).json({ error: 'Username required' });
      }
      if (!gameState.connectedPlayers.includes(username)) {
        gameState.connectedPlayers.push(username);
        console.log(`👤 Player joined: ${username} (total: ${gameState.connectedPlayers.length})`);
      }
      return res.json({ success: true, game: gameState });

    case 'leave':
      const { username: leaveUser } = req.body;
      if (leaveUser) {
        gameState.connectedPlayers = gameState.connectedPlayers.filter(p => p !== leaveUser);
        console.log(`👋 Player left: ${leaveUser} (remaining: ${gameState.connectedPlayers.length})`);
      }
      return res.json({ success: true });

    case 'check':
      const { roundId, solution } = req.body;
      const round = gameState.rounds.find(r => r.id === roundId);
      
      if (!round) {
        return res.status(404).json({ error: 'Round not found' });
      }

      const isCorrect = solution?.toUpperCase() === round.solution;
      console.log(`🔍 Check solution for round ${roundId}: ${solution} -> ${isCorrect ? '✅' : '❌'}`);
      
      return res.json({ 
        correct: isCorrect,
        solution: isCorrect ? round.solution : undefined,
      });

    default:
      return res.status(400).json({ error: 'Invalid action' });
  }
});

// PUT /api/game - Update round
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
    updates.solution = updates.solution.toUpperCase().slice(0, 6).padEnd(6, 'A');
  }

  gameState.rounds[roundIndex] = {
    ...gameState.rounds[roundIndex],
    ...updates,
  };

  console.log(`✏️ Round ${roundId} updated`);
  return res.json({ success: true, round: gameState.rounds[roundIndex] });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 Backend server running on http://localhost:${PORT}`);
  console.log('📋 Endpoints:');
  console.log('   GET  /api/game         - Get game state');
  console.log('   POST /api/game?action= - join, leave, start, stop, reset, check');
  console.log('   PUT  /api/game         - Update round config\n');
});

