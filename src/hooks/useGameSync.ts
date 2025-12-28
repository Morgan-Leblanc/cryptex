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
    accessCode: storedAccessCode,
    forceLogout,
  } = useGameStore();
  
  const lastIsStartedRef = useRef<boolean | null>(null);
  const lastAccessCodeRef = useRef<string | null>(null);
  const lastResetAtRef = useRef<string | null>(null);
  const sourceRef = useRef<EventSource | null>(null);

  // Initialiser les refs avec les valeurs actuelles
  useEffect(() => {
    if (storedAccessCode) {
      lastAccessCodeRef.current = storedAccessCode;
    }
  }, [storedAccessCode]);

  useEffect(() => {
    if (!isAuthenticated || !user || isAdmin || !isWaitingForStart) return;

    const handleGameStateEvent = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data);
        const gameState = payload?.gameState;
        
        if (!gameState) return;

        const currentIsStarted = gameState.isStarted ?? false;
        const currentAccessCode = gameState.accessCode ?? null;
        const currentResetAt = gameState.resetAt ?? null;

        // DÉTECTION DE RESET : Si resetAt a changé, forcer la déconnexion
        if (currentResetAt && currentResetAt !== lastResetAtRef.current && lastResetAtRef.current !== null) {
          console.log('🔄 Game was reset, forcing logout');
          forceLogout();
          return;
        }
        lastResetAtRef.current = currentResetAt;

        // DÉTECTION DE PARTIE SUPPRIMÉE : Si accessCode devient null alors qu'on en avait un
        if (lastAccessCodeRef.current && !currentAccessCode) {
          console.log('🔄 Game ended (accessCode removed), forcing logout');
          forceLogout();
          return;
        }
        lastAccessCodeRef.current = currentAccessCode;

        // Gestion normale du démarrage de partie
        if (currentIsStarted !== lastIsStartedRef.current) {
          lastIsStartedRef.current = currentIsStarted;

          if (currentIsStarted) {
            setWaitingForStart(false);
          } else if (currentAccessCode) {
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
  }, [isAuthenticated, isAdmin, isWaitingForStart, setWaitingForStart, user, forceLogout]);

  return {
    refresh: async () => {
      if (!isAuthenticated || !user || isAdmin) return;
      const response = await fetch(API_BASE);
      if (response.ok) {
        const data = await response.json();
        
        // Vérifier si la partie a été reset
        if (data.resetAt && data.resetAt !== lastResetAtRef.current && lastResetAtRef.current !== null) {
          console.log('🔄 Game was reset (via refresh), forcing logout');
          forceLogout();
          return;
        }
        lastResetAtRef.current = data.resetAt;
        
        // Vérifier si la partie a été supprimée
        if (lastAccessCodeRef.current && !data.accessCode) {
          console.log('🔄 Game ended (via refresh), forcing logout');
          forceLogout();
          return;
        }
        lastAccessCodeRef.current = data.accessCode;

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
