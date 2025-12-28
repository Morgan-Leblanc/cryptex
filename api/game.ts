import type { VercelRequest, VercelResponse } from '@vercel/node';

// ⚠️ IMPORTANT: Vercel Serverless Functions sont stateless
// L'état en mémoire se réinitialise à chaque cold start
// Pour la production, utilisez Vercel KV, Redis, ou une base de données

// ============================================
// TYPES
// ============================================
interface RoundConfig {
  id: number;
  name: string;
  solution: string;
  difficulty: 'Facile' | 'Moyen' | 'Difficile' | 'Expert';
  question: string;
  hints: string[];
}

interface Player {
  username: string;
  joinedAt: string;
  currentRound: number;
  roundsCompleted: boolean[];
  roundTimes: number[];
  isFinished: boolean;
  finishedAt: string | null;
  roundStartTime: number | null;
  hasFoundCurrentRound: boolean;
  avatar?: string;
}

interface GameState {
  id: string;
  rounds: RoundConfig[];
  isStarted: boolean;
  startedAt: string | null;
  createdAt: string;
  gameMode: 'free' | 'controlled';
  currentRound: number;
  roundActive: boolean;
  roundWinners: string[];
  revealedHints: number[];
  resetAt: string | null; // Timestamp du dernier reset pour forcer la déconnexion des joueurs
  // Nouveau: code d'accès et gestion de la partie
  accessCode: string | null; // Code défini par l'admin pour rejoindre
  isActive: boolean; // La partie existe-t-elle ?
  expiresAt: string | null; // Expiration automatique après 48h
  adminCreatedAt: string | null; // Quand l'admin a créé la partie
}

// ============================================
// CONFIGURATION PAR DÉFAUT
// ============================================
const DEFAULT_ROUNDS: RoundConfig[] = [
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
// ÉTAT GLOBAL (réinitialisé à chaque cold start)
// ============================================
let gameState: GameState = {
  id: `game_${Date.now()}`,
  rounds: JSON.parse(JSON.stringify(DEFAULT_ROUNDS)),
  isStarted: false,
  startedAt: null,
  createdAt: new Date().toISOString(),
  gameMode: 'free',
  currentRound: 0,
  roundActive: false,
  roundWinners: [],
  revealedHints: [0, 0, 0, 0, 0, 0],
  resetAt: null,
  // Pas de partie active par défaut
  accessCode: null,
  isActive: false,
  expiresAt: null,
  adminCreatedAt: null,
};

let players: Record<string, Player> = {};

// ============================================
// HELPERS
// ============================================
function createPlayer(username: string, avatar?: string): Player {
  return {
    username,
    joinedAt: new Date().toISOString(),
    currentRound: 0,
    roundsCompleted: [false, false, false, false, false, false],
    roundTimes: [0, 0, 0, 0, 0, 0],
    isFinished: false,
    finishedAt: null,
    roundStartTime: null,
    hasFoundCurrentRound: false,
    avatar,
  };
}

function getPlayersForAPI() {
  return Object.values(players).map(p => ({
    username: p.username,
    currentRound: gameState.gameMode === 'controlled' ? gameState.currentRound : p.currentRound + 1,
    isFinished: p.isFinished,
    roundsCompleted: p.roundsCompleted.filter(Boolean).length,
    hasFoundCurrentRound: p.hasFoundCurrentRound,
    avatar: p.avatar,
  }));
}

function getLeaderboard() {
  return Object.values(players)
    .sort((a, b) => {
      if (a.isFinished !== b.isFinished) return (b.isFinished ? 1 : 0) - (a.isFinished ? 1 : 0);
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
      avatar: p.avatar,
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
// HANDLER PRINCIPAL
// ============================================
export default function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { method } = req;
  const { action, admin, username: queryUsername } = req.query;

  // ========================================
  // GET - Récupérer l'état du jeu
  // ========================================
  if (method === 'GET') {
    // Player specific endpoint
    if (req.url?.includes('/player/')) {
      const username = req.url.split('/player/')[1]?.split('?')[0];
      const player = players[username || ''];
      if (!player) {
        return res.status(404).json({ error: 'Player not found' });
      }
      return res.status(200).json({
        username: player.username,
        currentRound: gameState.gameMode === 'controlled' ? gameState.currentRound : player.currentRound,
        roundsCompleted: player.roundsCompleted,
        isFinished: player.isFinished,
        hasFoundCurrentRound: player.hasFoundCurrentRound,
        gameMode: gameState.gameMode,
        roundActive: gameState.roundActive,
      });
    }

    // Leaderboard endpoint
    if (req.url?.includes('/leaderboard')) {
      return res.status(200).json({
        leaderboard: getLeaderboard(),
        gameStarted: gameState.isStarted,
        gameMode: gameState.gameMode,
        currentRound: gameState.currentRound,
        totalPlayers: Object.keys(players).length,
      });
    }

    // Main game state
    const response: Record<string, unknown> = {
      id: gameState.id,
      isStarted: gameState.isStarted,
      startedAt: gameState.startedAt,
      createdAt: gameState.createdAt,
      gameMode: gameState.gameMode,
      currentRound: gameState.currentRound,
      roundActive: gameState.roundActive,
      connectedPlayers: Object.keys(players),
      playerCount: Object.keys(players).length,
      resetAt: gameState.resetAt,
      // Nouvelles infos de partie
      isActive: gameState.isActive,
      accessCode: gameState.accessCode,
      expiresAt: gameState.expiresAt,
      adminCreatedAt: gameState.adminCreatedAt,
    };

    if (admin === 'true') {
      response.rounds = gameState.rounds;
      response.players = getPlayersForAPI();
      response.leaderboard = getLeaderboard();
      response.roundWinners = getRoundWinners();
      response.totalWinners = gameState.roundWinners.length;
      response.revealedHints = gameState.revealedHints;
      return res.status(200).json(response);
    }

    // Public: sans solutions, avec indices révélés
    response.rounds = gameState.rounds.map((r, index) => {
      const hintsCount = gameState.revealedHints[index] || 0;
      return {
        id: r.id,
        name: r.name,
        difficulty: r.difficulty,
        question: r.question,
        hints: r.hints ? r.hints.slice(0, hintsCount) : [],
        totalHints: r.hints ? r.hints.length : 0,
        revealedHints: hintsCount,
      };
    });
    response.revealedHints = gameState.revealedHints;
    
    return res.status(200).json(response);
  }

  // ========================================
  // POST - Actions
  // ========================================
  if (method === 'POST') {
    const body = req.body || {};

    switch (action) {
      // Mode de jeu
      case 'set-mode': {
        const { mode } = body;
        if (!['free', 'controlled'].includes(mode)) {
          return res.status(400).json({ error: 'Invalid mode' });
        }
        gameState.gameMode = mode;
        return res.status(200).json({ success: true, gameMode: mode });
      }

      // Démarrer le jeu
      case 'start': {
        if (gameState.isStarted) {
          return res.status(400).json({ error: 'Game already started' });
        }
        gameState.isStarted = true;
        gameState.startedAt = new Date().toISOString();
        
        if (gameState.gameMode === 'free') {
          const now = Date.now();
          Object.values(players).forEach(p => {
            p.roundStartTime = now;
            p.currentRound = 0;
          });
        } else {
          gameState.currentRound = 0;
          gameState.roundActive = false;
          gameState.roundWinners = [];
        }
        
        return res.status(200).json({ success: true, game: gameState });
      }

      // Lancer une manche (mode contrôlé)
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
        
        const now = Date.now();
        Object.values(players).forEach(p => {
          p.hasFoundCurrentRound = false;
          p.roundStartTime = now;
        });

        return res.status(200).json({ 
          success: true, 
          currentRound: nextRound,
          roundActive: true,
        });
      }

      // Terminer une manche
      case 'end-round': {
        if (gameState.gameMode !== 'controlled') {
          return res.status(400).json({ error: 'Only available in controlled mode' });
        }
        
        gameState.roundActive = false;
        
        if (gameState.currentRound >= 6) {
          Object.values(players).forEach(p => {
            if (p.roundsCompleted.every(Boolean)) {
              p.isFinished = true;
              p.finishedAt = new Date().toISOString();
            }
          });
        }
        
        return res.status(200).json({ 
          success: true, 
          roundActive: false,
          winners: getRoundWinners(),
        });
      }

      // Révéler un indice
      case 'reveal-hint': {
        const { roundId } = body;
        if (!roundId) {
          return res.status(400).json({ error: 'roundId required' });
        }
        
        const roundIndex = roundId - 1;
        if (roundIndex < 0 || roundIndex >= 6) {
          return res.status(400).json({ error: 'Invalid round' });
        }
        
        const round = gameState.rounds[roundIndex];
        const currentHints = gameState.revealedHints[roundIndex];
        
        if (currentHints >= 3 || !round.hints || round.hints.length <= currentHints) {
          return res.status(400).json({ error: 'No more hints available' });
        }
        
        gameState.revealedHints[roundIndex] = currentHints + 1;
        
        return res.status(200).json({ 
          success: true, 
          roundId,
          hintsRevealed: gameState.revealedHints[roundIndex],
          hint: round.hints[currentHints],
        });
      }

      // Arrêter le jeu
      case 'stop': {
        gameState.isStarted = false;
        gameState.roundActive = false;
        return res.status(200).json({ success: true, game: gameState });
      }

      // Reset complet - termine la partie
      case 'reset': {
        const resetTimestamp = new Date().toISOString();
        gameState = {
          id: `game_${Date.now()}`,
          rounds: JSON.parse(JSON.stringify(DEFAULT_ROUNDS)),
          isStarted: false,
          startedAt: null,
          createdAt: resetTimestamp,
          gameMode: 'free',
          currentRound: 0,
          roundActive: false,
          roundWinners: [],
          revealedHints: [0, 0, 0, 0, 0, 0],
          resetAt: resetTimestamp,
          accessCode: null,
          isActive: false,
          expiresAt: null,
          adminCreatedAt: null,
        };
        players = {};
        return res.status(200).json({ success: true, game: gameState, resetAt: resetTimestamp });
      }

      // Créer une nouvelle partie (admin)
      case 'create-game': {
        const { code } = body;
        if (!code || code.length < 4) {
          return res.status(400).json({ error: 'Code must be at least 4 characters' });
        }
        
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48h
        
        gameState = {
          id: `game_${Date.now()}`,
          rounds: JSON.parse(JSON.stringify(DEFAULT_ROUNDS)),
          isStarted: false,
          startedAt: null,
          createdAt: now.toISOString(),
          gameMode: 'free',
          currentRound: 0,
          roundActive: false,
          roundWinners: [],
          revealedHints: [0, 0, 0, 0, 0, 0],
          resetAt: null,
          accessCode: code.toUpperCase(),
          isActive: true,
          expiresAt: expiresAt.toISOString(),
          adminCreatedAt: now.toISOString(),
        };
        players = {};
        
        return res.status(200).json({ 
          success: true, 
          game: {
            id: gameState.id,
            accessCode: gameState.accessCode,
            isActive: gameState.isActive,
            expiresAt: gameState.expiresAt,
          }
        });
      }

      // Valider le code d'accès
      case 'validate-code': {
        const { code } = body;
        if (!code) {
          return res.status(400).json({ error: 'Code required' });
        }
        
        // Vérifier si la partie existe et n'est pas expirée
        if (!gameState.isActive || !gameState.accessCode) {
          return res.status(404).json({ 
            error: 'No active game',
            message: 'Aucune partie active. L\'admin doit d\'abord créer une partie.'
          });
        }
        
        // Vérifier expiration
        if (gameState.expiresAt && new Date() > new Date(gameState.expiresAt)) {
          return res.status(410).json({ 
            error: 'Game expired',
            message: 'Cette partie a expiré (48h).'
          });
        }
        
        // Vérifier le code
        if (code.toUpperCase() !== gameState.accessCode) {
          return res.status(401).json({ 
            error: 'Invalid code',
            message: 'Code invalide'
          });
        }
        
        return res.status(200).json({ 
          success: true,
          gameId: gameState.id,
        });
      }

      // Vérifier si un joueur existe (pour reconnexion)
      case 'reconnect': {
        const { username } = body;
        if (!username) {
          return res.status(400).json({ error: 'Username required' });
        }
        
        // Vérifier si la partie est active
        if (!gameState.isActive) {
          return res.status(404).json({ 
            error: 'No active game',
            reconnect: false 
          });
        }
        
        // Vérifier si le joueur existe
        const player = players[username];
        if (!player) {
          return res.status(404).json({ 
            error: 'Player not found',
            reconnect: false 
          });
        }
        
        return res.status(200).json({ 
          success: true,
          reconnect: true,
          player: {
            username: player.username,
            avatar: player.avatar,
            currentRound: player.currentRound,
            isFinished: player.isFinished,
          },
          game: {
            id: gameState.id,
            isStarted: gameState.isStarted,
            gameMode: gameState.gameMode,
            accessCode: gameState.accessCode,
          }
        });
      }

      // Terminer la partie (admin uniquement)
      case 'end-game': {
        gameState.isActive = false;
        gameState.resetAt = new Date().toISOString();
        return res.status(200).json({ 
          success: true, 
          message: 'Partie terminée',
          resetAt: gameState.resetAt,
        });
      }

      // Rejoindre
      case 'join': {
        const { username, avatar } = body;
        if (!username) {
          return res.status(400).json({ error: 'Username required' });
        }
        
        // Vérifier que la partie est active
        if (!gameState.isActive) {
          return res.status(404).json({ 
            error: 'No active game',
            message: 'Aucune partie active. L\'admin doit d\'abord créer une partie.'
          });
        }
        
        // Vérifier expiration
        if (gameState.expiresAt && new Date() > new Date(gameState.expiresAt)) {
          return res.status(410).json({ 
            error: 'Game expired',
            message: 'Cette partie a expiré.'
          });
        }
        
        // Si la partie est lancée et le joueur n'existe pas, refuser
        if (gameState.isStarted && !players[username]) {
          return res.status(403).json({ 
            error: 'Game already started',
            message: 'La partie a déjà commencé. Demandez à l\'admin de reset pour une nouvelle partie.'
          });
        }
        
        if (!players[username]) {
          players[username] = createPlayer(username, avatar);
        } else if (avatar) {
          // Update avatar if player already exists
          players[username].avatar = avatar;
        }
        
        return res.status(200).json({ 
          success: true, 
          player: players[username],
          game: {
            id: gameState.id,
            isStarted: gameState.isStarted,
            gameMode: gameState.gameMode,
            currentRound: gameState.currentRound,
            roundActive: gameState.roundActive,
            connectedPlayers: Object.keys(players),
            accessCode: gameState.accessCode,
          }
        });
      }

      // Quitter
      case 'leave': {
        const { username: leaveUser } = body;
        if (leaveUser && players[leaveUser]) {
          delete players[leaveUser];
          gameState.roundWinners = gameState.roundWinners.filter(u => u !== leaveUser);
        }
        return res.status(200).json({ success: true });
      }

      // Vérifier une solution
      case 'check': {
        const { username: checkUser, roundId, solution } = body;
        
        if (!roundId || !solution) {
          return res.status(400).json({ error: 'roundId and solution required' });
        }

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
        
        return res.status(200).json({ 
          correct: isCorrect,
          solution: isCorrect ? round.solution : undefined,
        });
      }

      // Compléter un round
      case 'complete-round': {
        const { username: completeUser, roundId, timeSeconds } = body;
        
        if (!completeUser || roundId === undefined) {
          return res.status(400).json({ error: 'username and roundId required' });
        }
        
        const player = players[completeUser];
        if (!player) {
          return res.status(404).json({ error: 'Player not found' });
        }
        
        const roundIndex = roundId - 1;
        if (roundIndex < 0 || roundIndex >= 6) {
          return res.status(400).json({ error: 'Invalid round' });
        }

        const time = timeSeconds || (player.roundStartTime 
          ? Math.round((Date.now() - player.roundStartTime) / 1000)
          : 60);
        
        player.roundsCompleted[roundIndex] = true;
        player.roundTimes[roundIndex] = time;

        if (gameState.gameMode === 'controlled') {
          player.hasFoundCurrentRound = true;
          if (!gameState.roundWinners.includes(completeUser)) {
            gameState.roundWinners.push(completeUser);
          }
          
          return res.status(200).json({
            success: true,
            isFinished: false,
            waitingForNextRound: true,
            position: gameState.roundWinners.indexOf(completeUser) + 1,
            leaderboard: getLeaderboard().slice(0, 5),
          });
        } else {
          const allCompleted = player.roundsCompleted.every(Boolean);
          if (allCompleted) {
            player.isFinished = true;
            player.finishedAt = new Date().toISOString();
          } else {
            player.currentRound = roundIndex + 1;
            player.roundStartTime = Date.now();
          }
          
          return res.status(200).json({
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
  }

  // ========================================
  // PUT - Mettre à jour une manche
  // ========================================
  if (method === 'PUT') {
    const { roundId, updates } = req.body || {};
    
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

    return res.status(200).json({ success: true, round: gameState.rounds[roundIndex] });
  }

  // Method not allowed
  res.setHeader('Allow', ['GET', 'POST', 'PUT', 'OPTIONS']);
  return res.status(405).json({ error: `Method ${method} not allowed` });
}
