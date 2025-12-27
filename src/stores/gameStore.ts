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
  
  // Game waiting state
  isWaitingForStart: boolean;
  
  // Actions
  setView: (view: AppView) => void;
  validateCode: (code: string) => boolean;
  login: (username: string, avatar?: string) => Promise<{ error: string; message: string } | void>;
  logout: () => Promise<void>;
  startGame: () => void;
  completeRound: (roundIndex: number, score: number) => void;
  resetGame: () => void;
  setWaitingForStart: (waiting: boolean) => void;
}

const ACCESS_CODE = '2026';
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
      isWaitingForStart: false,

      setView: (view) => set({ view }),

      validateCode: (code) => {
        if (code === ACCESS_CODE) {
          set({ isAuthenticated: true, view: 'login' });
          return true;
        }
        return false;
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

        // Call API to join game
        if (!isAdmin) {
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
          } catch (error) {
            console.error('Failed to join game:', error);
            return { error: 'Network error', message: 'Erreur de connexion au serveur' };
          }
        }

        // Check if game is started
        let isWaiting = true;
        try {
          const response = await fetch(API_BASE);
          if (response.ok) {
            const data = await response.json();
            isWaiting = !data.isStarted;
          }
        } catch (error) {
          console.error('Failed to check game state:', error);
        }

        if (isAdmin) {
          set({ 
            user, 
            isAdmin: true, 
            isWaitingForStart: false,
            view: 'game',
          });
        } else {
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
            isWaitingForStart: isWaiting,
            view: 'game',
          });
        }
      },

      logout: async () => {
        const { user, isAdmin } = get();
        
        // Call API to leave game
        if (user && !isAdmin) {
          try {
            await fetch(`${API_BASE}?action=leave`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username: user.username }),
            });
          } catch (error) {
            console.error('Failed to leave game:', error);
          }
        }

        set({
          view: 'code',
          isAuthenticated: false,
          user: null,
          session: null,
          isAdmin: false,
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
      }),
    }
  )
);
