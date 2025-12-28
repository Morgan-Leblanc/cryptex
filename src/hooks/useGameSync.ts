import { useEffect } from 'react';
import { useGameStore } from '../stores/gameStore';

const API_BASE = '/api/game';
const POLL_INTERVAL = 3000; // 3 secondes - simple et efficace

export function useGameSync() {
  const { 
    isAuthenticated, 
    user, 
    isAdmin, 
    setWaitingForStart,
  } = useGameStore();

  useEffect(() => {
    if (!isAuthenticated || !user || isAdmin) return;

    // Fonction simple pour récupérer l'état
    const fetchState = async () => {
      try {
        const response = await fetch(API_BASE);
        if (response.ok) {
          const data = await response.json();
          
          // Mettre à jour isWaitingForStart basé sur isStarted
          if (data.isStarted) {
            setWaitingForStart(false);
          } else if (data.accessCode) {
            setWaitingForStart(true);
          }
        }
      } catch (error) {
        console.error('Failed to sync:', error);
      }
    };

    // Premier fetch immédiat
    fetchState();

    // Polling simple toutes les 3 secondes
    const interval = setInterval(fetchState, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [isAuthenticated, user, isAdmin, setWaitingForStart]);

  return {};
}
