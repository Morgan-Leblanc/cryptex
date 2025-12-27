import { useEffect, useCallback, useRef } from 'react';
import { useGameStore } from '../stores/gameStore';
import { useAdminStore } from '../stores/adminStore';

const API_BASE = '/api/game';
const POLL_INTERVAL = 2000;

export function useGameSync() {
  const { 
    isAuthenticated, 
    user, 
    isAdmin, 
    setWaitingForStart,
    isWaitingForStart 
  } = useGameStore();
  
  const { gameConfig } = useAdminStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const syncWithServer = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    try {
      const response = await fetch(API_BASE);
      if (response.ok) {
        const data = await response.json();
        
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
      }
    } catch (error) {
      console.error('Failed to sync with server:', error);
    }
  }, [isAuthenticated, user, isAdmin, setWaitingForStart]);

  // Initial sync on mount
  useEffect(() => {
    if (isAuthenticated && user && !isAdmin) {
      syncWithServer();
    }
  }, [isAuthenticated, user, isAdmin, syncWithServer]);

  // Polling only when waiting for game to start
  useEffect(() => {
    if (isAuthenticated && user && !isAdmin && isWaitingForStart) {
      intervalRef.current = setInterval(syncWithServer, POLL_INTERVAL);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAuthenticated, user, isAdmin, isWaitingForStart, syncWithServer]);

  return { syncWithServer };
}

