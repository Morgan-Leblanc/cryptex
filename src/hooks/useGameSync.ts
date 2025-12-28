import { useEffect, useCallback, useRef } from 'react';
import { useGameStore } from '../stores/gameStore';

const API_BASE = '/api/game';
const POLL_INTERVAL = 3000; // Augmenté à 3s pour réduire la charge

export function useGameSync() {
  const { 
    isAuthenticated, 
    user, 
    isAdmin, 
    setWaitingForStart,
    logout,
    session
  } = useGameStore();
  
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastKnownResetRef = useRef<string | null>(null);
  const consecutiveInactiveCount = useRef(0); // Compteur pour éviter les faux positifs

  const syncWithServer = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    try {
      const response = await fetch(API_BASE);
      if (!response.ok) {
        // Erreur serveur, on ne fait rien (le serveur peut être temporairement indisponible)
        console.warn('Server returned error, keeping current state');
        return;
      }
      
      const data = await response.json();
      
      // Check if game is still active - avec tolérance aux erreurs
      if (!isAdmin && !data.isActive) {
        consecutiveInactiveCount.current++;
        
        // Ne déconnecter qu'après 3 réponses consécutives "inactive"
        // Cela évite les déconnexions dues à des cold starts temporaires
        if (consecutiveInactiveCount.current >= 3) {
          console.log('Game is no longer active (confirmed), logging out...');
          await logout();
          return;
        } else {
          console.warn(`Game inactive (${consecutiveInactiveCount.current}/3), waiting for confirmation...`);
          return;
        }
      } else {
        // Reset le compteur si la partie est active
        consecutiveInactiveCount.current = 0;
      }

      // Check if game was reset - force logout for all players
      if (!isAdmin && data.resetAt) {
        // Initialize lastKnownReset on first sync
        if (lastKnownResetRef.current === null) {
          lastKnownResetRef.current = data.resetAt;
        } else if (data.resetAt !== lastKnownResetRef.current) {
          // Reset happened! Force logout
          console.log('Game was reset by admin, logging out...');
          await logout();
          return;
        }
      }
      
      // For non-admin users, check if game is started
      if (!isAdmin) {
        if (data.isStarted) {
          // Game is started, player can play
          setWaitingForStart(false);
        } else {
          // Game not started, player should wait
          setWaitingForStart(true);
        }
      }
    } catch (error) {
      console.error('Failed to sync with server:', error);
      // On ne déconnecte pas en cas d'erreur réseau
    }
  }, [isAuthenticated, user, isAdmin, setWaitingForStart, logout]);

  // Initial sync on mount
  useEffect(() => {
    if (isAuthenticated && user && !isAdmin) {
      syncWithServer();
    }
  }, [isAuthenticated, user, isAdmin, syncWithServer]);

  // Reset the lastKnownReset when user logs out
  useEffect(() => {
    if (!session) {
      lastKnownResetRef.current = null;
    }
  }, [session]);

  // Polling for all connected players (not just waiting)
  useEffect(() => {
    if (isAuthenticated && user && !isAdmin) {
      intervalRef.current = setInterval(syncWithServer, POLL_INTERVAL);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAuthenticated, user, isAdmin, syncWithServer]);

  return { syncWithServer };
}

