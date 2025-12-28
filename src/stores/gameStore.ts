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
  
  // Admin session (unique per browser)
  adminSessionId: string | null;
  
  // Admin JWT token
  adminToken: string | null;
  
  // Actions
  setView: (view: AppView) => void;
  validateCode: (code: string) => Promise<{ error?: string; message?: string; success?: boolean }>;
  createGame: (code: string) => Promise<{ error?: string; message?: string; success?: boolean }>;
  login: (username: string, avatar?: string) => Promise<{ error: string; message: string } | void>;
  logout: () => Promise<void>;
  checkReconnect: () => Promise<boolean>;
  startGame: () => void;
  completeRound: (roundIndex: number, score: number) => void;
  resetGame: () => void;
  setWaitingForStart: (waiting: boolean) => void;
  endGame: () => Promise<void>;
  clearGameData: () => void;
  forceLogout: () => void;
  adminLogin: (password: string) => Promise<{ error?: string; message?: string; success?: boolean }>;
  verifyAdminToken: () => Promise<boolean>;
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
      adminSessionId: null,
      adminToken: null,

      setView: (view) => set({ view }),

      // Valider le code d'accès
      validateCode: async (code) => {
        const upperCode = code.toUpperCase();
        
        // Code spécial pour l'admin : "ADMIN" ou "ADMIN1" etc.
        if (upperCode.startsWith('ADMIN')) {
          set({ 
            isAuthenticated: true, 
            view: 'login',
            gameId: null,
            accessCode: null,
          });
          return { success: true };
        }
        
        // Pour les joueurs : valider le code de partie via API
        try {
          const response = await fetch(`${API_BASE}?action=validate-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
          });
          
          const data = await response.json();
          
          if (!response.ok) {
            return { 
              error: data.error, 
              message: data.message || 'Code invalide' 
            };
          }
          
          set({ 
            isAuthenticated: true, 
            view: 'login',
            gameId: data.gameId,
            accessCode: upperCode,
          });
          return { success: true };
        } catch (error) {
          console.error('Failed to validate code:', error);
          return { error: 'Network error', message: 'Erreur de connexion au serveur' };
        }
      },

      // Créer une nouvelle partie (admin)
      createGame: async (code) => {
        const { adminSessionId } = get();
        
        try {
          const response = await fetch(`${API_BASE}?action=create-game`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, adminSessionId }),
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
      // JAMAIS de déconnexion automatique - on essaie juste de resync avec le serveur
      checkReconnect: async () => {
        const { user, isAdmin, session, accessCode: storedAccessCode } = get();
        
        if (!user || isAdmin) return false;
        
        // Si on a déjà un accessCode et une session, on est déjà connecté
        if (storedAccessCode && session) {
          return true;
        }
        
        try {
          // D'abord essayer de reconnecter
          const response = await fetch(`${API_BASE}?action=reconnect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user.username }),
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.reconnect) {
              // Restaurer la session si elle n'existe pas
              const currentSession = get().session;
              const restoredSession: GameSession = currentSession || {
                userId: user.id,
                username: user.username,
                currentRound: data.player?.currentRound || 0,
                roundsCompleted: [false, false, false, false, false, false],
                roundScores: [0, 0, 0, 0, 0, 0],
                startedAt: new Date().toISOString(),
                isComplete: data.player?.isFinished || false,
              };
              
              set({
                isAuthenticated: true,
                session: restoredSession,
                gameId: data.game.id,
                accessCode: data.game.accessCode,
                isWaitingForStart: !data.game.isStarted,
                view: 'game',
              });
              return true;
            }
          }
          
          // Si le serveur ne reconnaît pas le joueur mais on a un accessCode, essayer de rejoindre
          if (storedAccessCode || session) {
            const rejoinResponse = await fetch(`${API_BASE}?action=join`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username: user.username, avatar: user.avatar }),
            });
            
            if (rejoinResponse.ok) {
              const rejoinData = await rejoinResponse.json();
              
              // Restaurer ou créer la session
              const currentSession = get().session;
              const restoredSession: GameSession = currentSession || {
                userId: user.id,
                username: user.username,
                currentRound: 0,
                roundsCompleted: [false, false, false, false, false, false],
                roundScores: [0, 0, 0, 0, 0, 0],
                startedAt: new Date().toISOString(),
                isComplete: false,
              };
              
              set({
                isAuthenticated: true,
                session: restoredSession,
                gameId: rejoinData.game?.id || get().gameId,
                accessCode: rejoinData.game?.accessCode || storedAccessCode || get().accessCode,
                isWaitingForStart: !rejoinData.game?.isStarted,
                view: 'game',
              });
              return true;
            }
          }
          
          // Même si rien ne marche côté serveur, on garde l'état local
          // Le joueur reste connecté - seul le bouton peut déconnecter
          // Si on a un accessCode, on reste connecté
          if (storedAccessCode) {
            // Restaurer la session minimale si elle n'existe pas
            if (!session) {
              const minimalSession: GameSession = {
                userId: user.id,
                username: user.username,
                currentRound: 0,
                roundsCompleted: [false, false, false, false, false, false],
                roundScores: [0, 0, 0, 0, 0, 0],
                startedAt: new Date().toISOString(),
                isComplete: false,
              };
              set({
                isAuthenticated: true,
                session: minimalSession,
                view: 'game',
              });
            } else {
              set({ view: 'game' });
            }
            return true;
          }
          
          // Pas d'accessCode et serveur ne répond pas → on garde quand même l'état si on a une session
          if (session) {
            set({ view: 'game' });
            return true;
          }
          
          return false;
          
        } catch (error) {
          console.error('Failed to check reconnect:', error);
          // Erreur réseau - on garde l'état actuel, pas de déconnexion
          // Si on a un accessCode ou une session, on reste connecté
          if (storedAccessCode || session) {
            if (!session && storedAccessCode) {
              const minimalSession: GameSession = {
                userId: user.id,
                username: user.username,
                currentRound: 0,
                roundsCompleted: [false, false, false, false, false, false],
                roundScores: [0, 0, 0, 0, 0, 0],
                startedAt: new Date().toISOString(),
                isComplete: false,
              };
              set({
                isAuthenticated: true,
                session: minimalSession,
                view: 'game',
              });
            } else {
              set({ view: 'game' });
            }
            return true;
          }
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

        // Pour l'admin
        if (isAdmin) {
          // Générer un sessionId unique pour cet admin (ou réutiliser l'existant)
          let sessionId = get().adminSessionId;
          if (!sessionId) {
            sessionId = `admin_${Date.now()}_${Math.random().toString(36).slice(2)}`;
          }
          
          // Vérifier qu'il n'y a pas déjà un admin connecté sur un autre navigateur
          try {
            const response = await fetch(`${API_BASE}?action=admin-login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId }),
            });
            
            if (!response.ok) {
              const errorData = await response.json();
              return { 
                error: errorData.error || 'Admin login failed', 
                message: errorData.message || 'Un administrateur est déjà connecté.' 
              };
            }
          } catch (error) {
            console.error('Failed to login admin:', error);
            // En cas d'erreur réseau, on laisse passer (pour dev local)
          }
          
          set({ 
            user, 
            isAdmin: true, 
            isAuthenticated: true,
            isWaitingForStart: false,
            adminSessionId: sessionId,
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
            accessCode: joinData.game?.accessCode || get().accessCode, // CRITIQUE : Sauvegarder l'accessCode
            isWaitingForStart: !joinData.game?.isStarted,
            view: 'game',
          });
        } catch (error) {
          console.error('Failed to join game:', error);
          return { error: 'Network error', message: 'Erreur de connexion au serveur' };
        }
      },

      // Admin login avec JWT
      adminLogin: async (password) => {
        try {
          const response = await fetch(`${API_BASE}?action=admin-auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: ADMIN_USERNAME, password }),
          });
          
          const data = await response.json();
          
          if (!response.ok) {
            return { 
              error: data.error, 
              message: data.message || 'Authentification échouée' 
            };
          }
          
          // Stocker le token et connecter l'admin
          const user: User = {
            id: `admin_${Date.now()}`,
            username: ADMIN_USERNAME,
            createdAt: new Date().toISOString(),
            currentRound: 0,
            completedRounds: [],
            totalScore: 0,
          };
          
          set({ 
            user, 
            isAdmin: true, 
            isAuthenticated: true,
            isWaitingForStart: false,
            adminToken: data.token,
            adminSessionId: `jwt_${Date.now()}`,
            view: 'game',
          });
          
          return { success: true };
        } catch (error) {
          console.error('Admin login failed:', error);
          return { error: 'Network error', message: 'Erreur de connexion au serveur' };
        }
      },

      // Vérifier si le token admin est encore valide
      verifyAdminToken: async () => {
        const { adminToken } = get();
        
        if (!adminToken) return false;
        
        try {
          const response = await fetch(`${API_BASE}?action=admin-verify`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${adminToken}`,
            },
          });
          
          return response.ok;
        } catch {
          return false;
        }
      },

      logout: async () => {
        const { isAdmin } = get();
        
        // Si c'est l'admin qui se déconnecte → déconnecter tout le monde
        if (isAdmin) {
          try {
            await fetch(`${API_BASE}?action=admin-logout`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            });
          } catch (error) {
            console.error('Failed to logout admin:', error);
          }
        }
        
        // Pour les joueurs normaux, on ne supprime PAS du serveur
        // Reset de l'état local
        set({
          view: 'code',
          isAuthenticated: false,
          user: null,
          session: null,
          isAdmin: false,
          gameId: null,
          accessCode: null,
          isWaitingForStart: false,
          adminSessionId: null,
          adminToken: null,
        });
      },

      // Terminer la partie (admin uniquement) - mais l'admin reste connecté
      endGame: async () => {
        try {
          await fetch(`${API_BASE}?action=end-game`, {
            method: 'POST',
          });
        } catch (error) {
          console.error('Failed to end game:', error);
        }
        
        // L'admin reste connecté, juste la partie est terminée
        // On reset gameId et accessCode pour montrer l'écran de création
        set({
          gameId: null,
          accessCode: null,
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

      // Nettoyer les données de jeu (après un reset admin)
      clearGameData: () => {
        set({
          gameId: null,
          accessCode: null,
        });
      },

      // Forcer la déconnexion (pour les joueurs quand la partie est reset)
      forceLogout: () => {
        set({
          view: 'code',
          isAuthenticated: false,
          user: null,
          session: null,
          isAdmin: false,
          gameId: null,
          accessCode: null,
          isWaitingForStart: false,
          adminSessionId: null,
          adminToken: null,
        });
      },
    }),
    {
      name: 'cryptex-game-storage',
      // Retour à localStorage pour la persistance
      // Mais on génère un ID unique par onglet pour éviter les conflits
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        session: state.session,
        isAdmin: state.isAdmin,
        adminToken: state.adminToken,
        gameId: state.gameId,
        accessCode: state.accessCode,
        adminSessionId: state.adminSessionId,
      }),
    }
  )
);
