import { useEffect, useRef } from 'react';
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
  
  // Garder une référence de l'état précédent pour éviter les mises à jour inutiles
  const lastIsStartedRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user || isAdmin) return;

    // Fonction simple pour récupérer l'état
    const fetchState = async () => {
      try {
        const response = await fetch(API_BASE);
        if (response.ok) {
          const data = await response.json();
          
          // Ne mettre à jour que si isStarted a vraiment changé
          const currentIsStarted = data.isStarted || false;
          
          if (currentIsStarted !== lastIsStartedRef.current) {
            lastIsStartedRef.current = currentIsStarted;
            
            // Mettre à jour isWaitingForStart basé sur isStarted
            if (currentIsStarted) {
              setWaitingForStart(false);
            } else if (data.accessCode) {
              setWaitingForStart(true);
            }
          }
        }
      } catch (error) {
        console.error('Failed to sync:', error);
        // En cas d'erreur, ne rien changer
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
