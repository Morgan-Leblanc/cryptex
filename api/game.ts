import type { VercelRequest, VercelResponse } from '@vercel/node';

// Game state (in-memory for demo - use database in production)
interface RoundConfig {
  id: number;
  name: string;
  solution: string;
  hint: string;
  difficulty: 'Facile' | 'Moyen' | 'Difficile' | 'Expert';
}

interface GameState {
  id: string;
  rounds: RoundConfig[];
  isStarted: boolean;
  startedAt: string | null;
  createdAt: string;
  connectedPlayers: string[];
}

let gameState: GameState | null = null;

const DEFAULT_ROUNDS: RoundConfig[] = [
  { id: 1, name: "L'Éveil", solution: 'AURORE', hint: 'Le moment où le jour se lève...', difficulty: 'Facile' },
  { id: 2, name: 'Le Mystère', solution: 'ENIGME', hint: 'Une question qui défie la logique...', difficulty: 'Moyen' },
  { id: 3, name: 'La Quête', solution: 'TRESOR', hint: 'Ce que les aventuriers cherchent...', difficulty: 'Moyen' },
  { id: 4, name: 'Le Savoir', solution: 'ESPRIT', hint: 'Le siège de la pensée humaine...', difficulty: 'Difficile' },
  { id: 5, name: 'Le Pouvoir', solution: 'FORCES', hint: 'Ce qui donne la capacité d\'agir...', difficulty: 'Difficile' },
  { id: 6, name: "L'Ultime", solution: 'VAINCU', hint: 'L\'état de celui qui a perdu...', difficulty: 'Expert' },
];

function initGameState(): GameState {
  return {
    id: `game_${Date.now()}`,
    rounds: [...DEFAULT_ROUNDS],
    isStarted: false,
    startedAt: null,
    createdAt: new Date().toISOString(),
    connectedPlayers: [],
  };
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Initialize game state if needed
  if (!gameState) {
    gameState = initGameState();
  }

  const { method } = req;
  const { action } = req.query;

  switch (method) {
    case 'GET': {
      // Get game state (without solutions for non-admin)
      const { admin } = req.query;
      
      if (admin === 'true') {
        return res.status(200).json(gameState);
      }

      // Return state without solutions
      const publicState = {
        ...gameState,
        rounds: gameState.rounds.map(r => ({
          id: r.id,
          name: r.name,
          hint: r.hint,
          difficulty: r.difficulty,
          // Solution hidden
        })),
      };
      return res.status(200).json(publicState);
    }

    case 'POST': {
      switch (action) {
        case 'start': {
          if (gameState.isStarted) {
            return res.status(400).json({ error: 'Game already started' });
          }
          gameState.isStarted = true;
          gameState.startedAt = new Date().toISOString();
          return res.status(200).json({ success: true, game: gameState });
        }

        case 'stop': {
          gameState.isStarted = false;
          return res.status(200).json({ success: true, game: gameState });
        }

        case 'reset': {
          gameState = initGameState();
          return res.status(200).json({ success: true, game: gameState });
        }

        case 'join': {
          const { username } = req.body;
          if (!username) {
            return res.status(400).json({ error: 'Username required' });
          }
          if (!gameState.connectedPlayers.includes(username)) {
            gameState.connectedPlayers.push(username);
          }
          return res.status(200).json({ success: true, game: gameState });
        }

        case 'leave': {
          const { username } = req.body;
          if (username) {
            gameState.connectedPlayers = gameState.connectedPlayers.filter(p => p !== username);
          }
          return res.status(200).json({ success: true });
        }

        case 'check': {
          // Check solution for a round
          const { roundId, solution } = req.body;
          const round = gameState.rounds.find(r => r.id === roundId);
          
          if (!round) {
            return res.status(404).json({ error: 'Round not found' });
          }

          const isCorrect = solution?.toUpperCase() === round.solution;
          return res.status(200).json({ 
            correct: isCorrect,
            // Only reveal solution if correct
            solution: isCorrect ? round.solution : undefined,
          });
        }

        default:
          return res.status(400).json({ error: 'Invalid action' });
      }
    }

    case 'PUT': {
      // Update round configuration (admin only)
      const { roundId, updates } = req.body;
      
      if (!roundId || !updates) {
        return res.status(400).json({ error: 'roundId and updates required' });
      }

      const roundIndex = gameState.rounds.findIndex(r => r.id === roundId);
      if (roundIndex === -1) {
        return res.status(404).json({ error: 'Round not found' });
      }

      // Ensure solution is 6 letters uppercase
      if (updates.solution) {
        updates.solution = updates.solution.toUpperCase().slice(0, 6).padEnd(6, 'A');
      }

      gameState.rounds[roundIndex] = {
        ...gameState.rounds[roundIndex],
        ...updates,
      };

      return res.status(200).json({ success: true, round: gameState.rounds[roundIndex] });
    }

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'OPTIONS']);
      return res.status(405).json({ error: `Method ${method} not allowed` });
  }
}

