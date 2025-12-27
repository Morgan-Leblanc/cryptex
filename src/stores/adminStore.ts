import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface RoundConfig {
  id: number;
  name: string;
  solution: string;
  hint: string;
  difficulty: 'Facile' | 'Moyen' | 'Difficile' | 'Expert';
}

export interface GameConfig {
  id: string;
  rounds: RoundConfig[];
  isStarted: boolean;
  startedAt: string | null;
  createdAt: string;
  createdBy: string;
}

interface AdminState {
  isAdmin: boolean;
  gameConfig: GameConfig | null;
  connectedPlayers: string[];
  
  // Actions
  setAdmin: (isAdmin: boolean) => void;
  createGame: (rounds: RoundConfig[]) => void;
  updateRound: (roundId: number, updates: Partial<RoundConfig>) => void;
  startGame: () => void;
  stopGame: () => void;
  resetGame: () => void;
  addPlayer: (username: string) => void;
  removePlayer: (username: string) => void;
}

const DEFAULT_ROUNDS: RoundConfig[] = [
  {
    id: 1,
    name: "L'Éveil",
    solution: 'AURORE',
    hint: 'Le moment où le jour se lève sur l\'horizon...',
    difficulty: 'Facile',
  },
  {
    id: 2,
    name: 'Le Mystère',
    solution: 'ENIGME',
    hint: 'Une question qui défie la logique...',
    difficulty: 'Moyen',
  },
  {
    id: 3,
    name: 'La Quête',
    solution: 'TRESOR',
    hint: 'Ce que les aventuriers cherchent...',
    difficulty: 'Moyen',
  },
  {
    id: 4,
    name: 'Le Savoir',
    solution: 'ESPRIT',
    hint: 'Le siège de la pensée humaine...',
    difficulty: 'Difficile',
  },
  {
    id: 5,
    name: 'Le Pouvoir',
    solution: 'FORCES',
    hint: 'Ce qui donne la capacité d\'agir...',
    difficulty: 'Difficile',
  },
  {
    id: 6,
    name: "L'Ultime",
    solution: 'VAINCU',
    hint: 'L\'état de celui qui a perdu le combat...',
    difficulty: 'Expert',
  },
];

export const useAdminStore = create<AdminState>()(
  persist(
    (set, get) => ({
      isAdmin: false,
      gameConfig: null,
      connectedPlayers: [],

      setAdmin: (isAdmin) => set({ isAdmin }),

      createGame: (rounds) => {
        const gameConfig: GameConfig = {
          id: `game_${Date.now()}`,
          rounds,
          isStarted: false,
          startedAt: null,
          createdAt: new Date().toISOString(),
          createdBy: 'admin2026',
        };
        set({ gameConfig });
      },

      updateRound: (roundId, updates) => {
        const { gameConfig } = get();
        if (!gameConfig) return;

        const updatedRounds = gameConfig.rounds.map((round) =>
          round.id === roundId ? { ...round, ...updates } : round
        );

        set({
          gameConfig: {
            ...gameConfig,
            rounds: updatedRounds,
          },
        });
      },

      startGame: () => {
        const { gameConfig } = get();
        if (!gameConfig) return;

        set({
          gameConfig: {
            ...gameConfig,
            isStarted: true,
            startedAt: new Date().toISOString(),
          },
        });
      },

      stopGame: () => {
        const { gameConfig } = get();
        if (!gameConfig) return;

        set({
          gameConfig: {
            ...gameConfig,
            isStarted: false,
          },
        });
      },

      resetGame: () => {
        set({
          gameConfig: {
            id: `game_${Date.now()}`,
            rounds: DEFAULT_ROUNDS,
            isStarted: false,
            startedAt: null,
            createdAt: new Date().toISOString(),
            createdBy: 'admin2026',
          },
          connectedPlayers: [],
        });
      },

      addPlayer: (username) => {
        const { connectedPlayers } = get();
        if (!connectedPlayers.includes(username)) {
          set({ connectedPlayers: [...connectedPlayers, username] });
        }
      },

      removePlayer: (username) => {
        const { connectedPlayers } = get();
        set({
          connectedPlayers: connectedPlayers.filter((p) => p !== username),
        });
      },
    }),
    {
      name: 'cryptex-admin-storage',
    }
  )
);

export const getDefaultRounds = () => DEFAULT_ROUNDS;

