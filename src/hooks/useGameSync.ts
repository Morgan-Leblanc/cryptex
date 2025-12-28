import { useEffect, useRef } from 'react';
import { useGameStore } from '../stores/gameStore';

const API_BASE = '/api/game';

export function useGameSync() {
  const { 
    isAuthenticated, 
    user, 
    isAdmin, 
    isWaitingForStart,
    setWaitingForStart,
  } = useGameStore();
  
  const lastIsStartedRef = useRef<boolean | null>(null);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user || isAdmin || !isWaitingForStart) return;

    const handleGameStateEvent = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data);
        const currentIsStarted = payload?.gameState?.isStarted ?? false;

        if (currentIsStarted !== lastIsStartedRef.current) {
          lastIsStartedRef.current = currentIsStarted;

          if (currentIsStarted) {
            setWaitingForStart(false);
          } else if (payload?.gameState?.accessCode) {
            setWaitingForStart(true);
          }
        }
      } catch (error) {
        console.error('Failed to parse SSE payload:', error);
      }
    };

    const source = new EventSource(`${API_BASE}?stream=1`);
    sourceRef.current = source;
    source.addEventListener('game-state', handleGameStateEvent);
    source.addEventListener('message', handleGameStateEvent);
    source.onerror = () => {
      // L'EventSource se reconnecte automatiquement
    };

    return () => {
      source.removeEventListener('game-state', handleGameStateEvent);
      source.removeEventListener('message', handleGameStateEvent);
      source.close();
      sourceRef.current = null;
    };
  }, [isAuthenticated, isAdmin, isWaitingForStart, setWaitingForStart, user]);

  return {
    refresh: async () => {
      if (!isAuthenticated || !user || isAdmin) return;
      const response = await fetch(API_BASE);
      if (response.ok) {
        const data = await response.json();
        const currentIsStarted = data.isStarted || false;
        if (currentIsStarted !== lastIsStartedRef.current) {
          lastIsStartedRef.current = currentIsStarted;
          if (currentIsStarted) {
            setWaitingForStart(false);
          } else if (data.accessCode) {
            setWaitingForStart(true);
          }
        }
      }
    },
  };
}
