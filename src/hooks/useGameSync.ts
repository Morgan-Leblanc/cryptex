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
  
  // Garder une référence de l'état précédent pour éviter les mises à jour inutiles
  const lastIsStartedRef = useRef<boolean | null>(null);

  useEffect(() => {
    // Ne s'activer QUE dans la waiting room (isWaitingForStart)
    // Pendant le jeu, on ne veut PAS de sync automatique pour éviter les refresh
    if (!isAuthenticated || !user || isAdmin || !isWaitingForStart) return;

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

    // Fetch initial seulement
    // PAS de visibilitychange - on reste stable en waiting room
    // Le changement vers le jeu se fera via un refresh manuel ou après une action
    fetchState();

    // Pas de polling ni de visibility change - on reste stable
    // L'utilisateur peut rafraîchir manuellement si nécessaire
  }, [isAuthenticated, user, isAdmin, isWaitingForStart, setWaitingForStart]);

  // Exposer une fonction pour refresh manuel si nécessaire
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
    }
  };
}
