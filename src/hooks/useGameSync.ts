import { useEffect, useCallback, useRef } from 'react';
import { useGameStore } from '../stores/gameStore';

const API_BASE = '/api/game';
const POLL_INTERVAL = 3000;

export function useGameSync() {
  const { 
    isAuthenticated, 
    user, 
    isAdmin, 
    setWaitingForStart,
  } = useGameStore();
  
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const syncWithServer = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    try {
      const response = await fetch(API_BASE);
      if (!response.ok) {
        console.warn('Server returned error, keeping current state');
        return;
      }
      
      const data = await response.json();
      
      // Pour les joueurs : juste vérifier si le jeu est lancé
      // PAS de déconnexion automatique - seul le bouton peut déconnecter
      if (!isAdmin) {
        if (data.isStarted) {
          setWaitingForStart(false);
        } else if (data.isActive) {
          // Partie active mais pas encore lancée
          setWaitingForStart(true);
        }
        // Si isActive est false, on ne fait rien - le joueur reste connecté
      }
    } catch (error) {
      console.error('Failed to sync with server:', error);
      // Erreur réseau - on garde l'état actuel
    }
  }, [isAuthenticated, user, isAdmin, setWaitingForStart]);

  // Initial sync on mount
  useEffect(() => {
    if (isAuthenticated && user && !isAdmin) {
      syncWithServer();
    }
  }, [isAuthenticated, user, isAdmin, syncWithServer]);

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

