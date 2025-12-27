import { useEffect, useCallback, useRef } from 'react';
import { useGameStore } from '../stores/gameStore';

const API_BASE = '/api/game';
const POLL_INTERVAL = 2000;

export function useGameSync() {
  const { 
    isAuthenticated, 
    user, 
    isAdmin, 
    setWaitingForStart,
    isWaitingForStart,
    logout,
    session
  } = useGameStore();
  
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastKnownResetRef = useRef<string | null>(null);

  const syncWithServer = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    try {
      const response = await fetch(API_BASE);
      if (response.ok) {
        const data = await response.json();
        
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
      }
    } catch (error) {
      console.error('Failed to sync with server:', error);
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

