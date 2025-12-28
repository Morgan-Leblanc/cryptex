import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppView, GameSession, User } from '../types';

interface GameState {
  // App state
  view: AppView;
  isAuthenticated: boolean;
  
  // User state
  user: User | null;
  session: GameSession | null;
  isAdmin: boolean;
  
  // Game state
  gameId: string | null;
  accessCode: string | null;
  isWaitingForStart: boolean;
  
  // Actions
  setView: (view: AppView) => void;
  validateCode: (code: string) => Promise<{ error?: string; message?: string; success?: boolean }>;
  joinGameWithCode: (gameCode: string) => Promise<{ error?: string; message?: string; success?: boolean }>;
  createGame: (code: string) => Promise<{ error?: string; message?: string; success?: boolean }>;
  login: (username: string, avatar?: string) => Promise<{ error: string; message: string } | void>;
  logout: () => Promise<void>;
  checkReconnect: () => Promise<boolean>;
  startGame: () => void;
  completeRound: (roundIndex: number, score: number) => void;
  resetGame: () => void;
  setWaitingForStart: (waiting: boolean) => void;
  endGame: () => Promise<void>;
}

const ADMIN_USERNAME = 'admin2026';
const API_BASE = '/api/game';

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      view: 'code',
      isAuthenticated: false,
      user: null,
      session: null,
      isAdmin: false,
      gameId: null,
      accessCode: null,
      isWaitingForStart: false,

      setView: (view) => set({ view }),

      // Valider le code d'accès à l'app (code fixe 2026)
      validateCode: async (code) => {
        // Code fixe pour accéder à l'application
        if (code === '2026') {
          set({ 
            isAuthenticated: true, 
            view: 'login',
          });
          return { success: true };
        }
        return { error: 'Invalid code', message: 'Code invalide' };
      },

      // Rejoindre une partie avec le code de partie
      joinGameWithCode: async (gameCode: string) => {
        try {
          const response = await fetch(`${API_BASE}?action=validate-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: gameCode }),
          });
          
          const data = await response.json();
          
          if (!response.ok) {
            return { 
              error: data.error, 
              message: data.message || 'Code de partie invalide' 
            };
          }
          
          set({ 
            gameId: data.gameId,
            accessCode: gameCode.toUpperCase(),
          });
          return { success: true };
        } catch (error) {
          console.error('Failed to join game:', error);
          return { error: 'Network error', message: 'Erreur de connexion au serveur' };
        }
      },

      // Créer une nouvelle partie (admin)
      createGame: async (code) => {
        try {
          const response = await fetch(`${API_BASE}?action=create-game`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
          });
          
          const data = await response.json();
          
          if (!response.ok) {
            return { 
              error: data.error, 
              message: data.message || 'Impossible de créer la partie' 
            };
          }
          
          set({ 
            gameId: data.game.id,
            accessCode: data.game.accessCode,
          });
          return { success: true };
        } catch (error) {
          console.error('Failed to create game:', error);
          return { error: 'Network error', message: 'Erreur de connexion au serveur' };
        }
      },

      // Vérifier si le joueur peut se reconnecter
      checkReconnect: async () => {
        const { user, isAdmin } = get();
        
        if (!user || isAdmin) return false;
        
        try {
          const response = await fetch(`${API_BASE}?action=reconnect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user.username }),
          });
          
          if (!response.ok) {
            // La partie n'existe plus ou le joueur n'est plus enregistré
            set({
              view: 'code',
              isAuthenticated: false,
              user: null,
              session: null,
              gameId: null,
              accessCode: null,
              isWaitingForStart: false,
            });
            return false;
          }
          
          const data = await response.json();
          
          if (data.reconnect) {
            // Mettre à jour avec les données du serveur
            set({
              isAuthenticated: true,
              gameId: data.game.id,
              accessCode: data.game.accessCode,
              isWaitingForStart: !data.game.isStarted,
              view: 'game',
            });
            return true;
          }
          
          return false;
        } catch (error) {
          console.error('Failed to check reconnect:', error);
          return false;
        }
      },

      login: async (username, avatar) => {
        const isAdmin = username.toLowerCase() === ADMIN_USERNAME.toLowerCase();
        const userId = `user_${username.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
        
        const user: User = {
          id: userId,
          username,
          createdAt: new Date().toISOString(),
          currentRound: 0,
          completedRounds: [],
          totalScore: 0,
          avatar: avatar || undefined,
        };

        // Pour l'admin, pas besoin de rejoindre via API
        if (isAdmin) {
          set({ 
            user, 
            isAdmin: true, 
            isAuthenticated: true,
            isWaitingForStart: false,
            view: 'game',
          });
          return;
        }

        // Call API to join game
        try {
          const response = await fetch(`${API_BASE}?action=join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, avatar }),
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            return { 
              error: errorData.error || 'Join failed', 
              message: errorData.message || 'Impossible de rejoindre la partie' 
            };
          }

          const joinData = await response.json();

          const session: GameSession = {
            userId,
            username,
            currentRound: 0,
            roundsCompleted: [false, false, false, false, false, false],
            roundScores: [0, 0, 0, 0, 0, 0],
            startedAt: new Date().toISOString(),
            isComplete: false,
          };

          set({ 
            user, 
            session, 
            isAdmin: false,
            gameId: joinData.game?.id || get().gameId,
            isWaitingForStart: !joinData.game?.isStarted,
            view: 'game',
          });
        } catch (error) {
          console.error('Failed to join game:', error);
          return { error: 'Network error', message: 'Erreur de connexion au serveur' };
        }
      },

      logout: async () => {
        const { user, isAdmin } = get();
        
        // Pour les joueurs normaux, on ne supprime PAS du serveur (pour permettre la reconnexion)
        // On reset juste l'état local
        // Seul l'admin qui fait "end-game" termine vraiment la partie
        
        if (user && !isAdmin) {
          // On garde le joueur sur le serveur pour la reconnexion
          // Mais on reset l'état local
        }

        set({
          view: 'code',
          isAuthenticated: false,
          user: null,
          session: null,
          isAdmin: false,
          gameId: null,
          accessCode: null,
          isWaitingForStart: false,
        });
      },

      // Terminer la partie (admin uniquement)
      endGame: async () => {
        try {
          await fetch(`${API_BASE}?action=end-game`, {
            method: 'POST',
          });
        } catch (error) {
          console.error('Failed to end game:', error);
        }
        
        set({
          view: 'code',
          isAuthenticated: false,
          user: null,
          session: null,
          isAdmin: false,
          gameId: null,
          accessCode: null,
          isWaitingForStart: false,
        });
      },

      startGame: () => {
        const { session } = get();
        if (session) {
          set({ view: 'game', isWaitingForStart: false });
        }
      },

      completeRound: (roundIndex, score) => {
        const { session, user } = get();
        if (!session || !user) return;

        const newRoundsCompleted = [...session.roundsCompleted];
        newRoundsCompleted[roundIndex] = true;

        const newRoundScores = [...session.roundScores];
        newRoundScores[roundIndex] = score;

        const allComplete = newRoundsCompleted.every((r) => r);
        const nextRound = allComplete ? session.currentRound : roundIndex + 1;

        const updatedSession: GameSession = {
          ...session,
          roundsCompleted: newRoundsCompleted,
          roundScores: newRoundScores,
          currentRound: nextRound,
          isComplete: allComplete,
        };

        const totalScore = newRoundScores.reduce((a, b) => a + b, 0);

        set({
          session: updatedSession,
          user: {
            ...user,
            currentRound: nextRound,
            completedRounds: newRoundsCompleted
              .map((c, i) => (c ? i : -1))
              .filter((i) => i >= 0),
            totalScore,
          },
          view: allComplete ? 'victory' : 'game',
        });
      },

      resetGame: () => {
        const { user } = get();
        if (!user) return;

        const session: GameSession = {
          userId: user.id,
          username: user.username,
          currentRound: 0,
          roundsCompleted: [false, false, false, false, false, false],
          roundScores: [0, 0, 0, 0, 0, 0],
          startedAt: new Date().toISOString(),
          isComplete: false,
        };

        set({ session, view: 'game', isWaitingForStart: false });
      },

      setWaitingForStart: (waiting) => set({ isWaitingForStart: waiting }),
    }),
    {
      name: 'cryptex-game-storage',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        session: state.session,
        isAdmin: state.isAdmin,
        gameId: state.gameId,
        accessCode: state.accessCode,
      }),
    }
  )
);
