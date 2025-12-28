import { useEffect, useCallback, useRef } from 'react';
import { useGameStore } from '../stores/gameStore';

const API_BASE = '/api/game';
const BASE_POLL_INTERVAL = 2000; // 2 secondes de base (plus rapide pour détecter le lancement)
const MAX_POLL_INTERVAL = 30000; // Max 30 secondes
const DEBOUNCE_DELAY = 300; // 300ms de debounce (plus rapide)

interface CachedState {
  data: any;
  timestamp: number;
  version?: number;
}

export function useGameSync() {
  const { 
    isAuthenticated, 
    user, 
    isAdmin, 
    setWaitingForStart,
  } = useGameStore();
  
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cacheRef = useRef<CachedState | null>(null);
  const errorCountRef = useRef(0);
  const lastSuccessRef = useRef(Date.now());
  const lastStartedAtRef = useRef<string | null>(null); // Pour détecter les changements de isStarted

  // Debounced sync function
  const syncWithServer = useCallback(async (immediate = false) => {
    if (!isAuthenticated || !user) return;

    // Debounce sauf si immédiat
    if (!immediate && timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const performSync = async () => {
      try {
        // Vérifier le cache d'abord (mais toujours vérifier isStarted)
        const now = Date.now();
        const shouldUseCache = cacheRef.current && !immediate && (now - cacheRef.current.timestamp) < 1000;
        
        // Si on utilise le cache, vérifier quand même si isStarted a changé
        if (shouldUseCache && cacheRef.current) {
          const cachedData = cacheRef.current.data;
          const startedAtChanged = cachedData?.startedAt !== lastStartedAtRef.current;
          
          // Si startedAt a changé, on doit faire la requête pour avoir les nouvelles données
          if (!startedAtChanged && cachedData) {
            if (!isAdmin) {
              if (cachedData.isStarted) {
                setWaitingForStart(false);
              } else if (cachedData.isActive || cachedData.accessCode) {
                setWaitingForStart(true);
              }
            }
            return; // Utiliser le cache seulement si startedAt n'a pas changé
          }
        }

        // Pour les joueurs : envoyer un heartbeat pour maintenir la présence
        if (!isAdmin && user) {
          try {
            // Heartbeat en parallèle pour maintenir la présence
            fetch(`${API_BASE}?action=heartbeat`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username: user.username }),
            }).catch(() => {
              // Ignorer les erreurs de heartbeat, ce n'est pas critique
            });
          } catch {
            // Ignorer
          }
        }
        
        const response = await fetch(API_BASE);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        // Détecter les changements de isStarted via startedAt
        const startedAtChanged = data.startedAt !== lastStartedAtRef.current;
        if (startedAtChanged && data.startedAt) {
          // La partie vient d'être lancée !
          lastStartedAtRef.current = data.startedAt;
          // Invalider le cache pour forcer une mise à jour immédiate
          cacheRef.current = null;
          
          // Pour les joueurs : mettre à jour immédiatement isWaitingForStart
          if (!isAdmin) {
            if (data.isStarted) {
              setWaitingForStart(false);
            }
          }
        } else if (data.startedAt) {
          // Mettre à jour la référence même si pas de changement
          lastStartedAtRef.current = data.startedAt;
        }
        
        // Mettre en cache
        cacheRef.current = {
          data,
          timestamp: Date.now(),
        };
        
        // Reset error count on success
        errorCountRef.current = 0;
        lastSuccessRef.current = Date.now();
        
        // Pour les joueurs : vérifier si le jeu est lancé - PRIORITÉ ABSOLUE
        // NE JAMAIS modifier isAuthenticated ou user - juste isWaitingForStart
        if (!isAdmin) {
          if (data.isStarted) {
            setWaitingForStart(false);
          } else if (data.accessCode || data.isActive) {
            // Si on a un accessCode, la partie existe (même si isActive est false)
            setWaitingForStart(true);
          }
          // Si pas d'accessCode et pas isActive, on ne fait rien
          // Le joueur reste connecté grâce à son accessCode dans le store
        }
      } catch (error) {
        console.error('Failed to sync with server:', error);
        errorCountRef.current++;
        
        // Exponential backoff : augmenter l'intervalle en cas d'erreurs
        // Mais on garde quand même le cache pour l'UI
        if (cacheRef.current) {
          const cachedData = cacheRef.current.data;
          if (!isAdmin && cachedData) {
            if (cachedData.isStarted) {
              setWaitingForStart(false);
            } else if (cachedData.isActive) {
              setWaitingForStart(true);
            }
          }
        }
      }
    };

    if (immediate) {
      await performSync();
    } else {
      timeoutRef.current = setTimeout(performSync, DEBOUNCE_DELAY);
    }
  }, [isAuthenticated, user, isAdmin, setWaitingForStart]);

  // Calculer l'intervalle dynamique basé sur les erreurs
  const getPollInterval = useCallback(() => {
    const baseInterval = BASE_POLL_INTERVAL;
    const errorMultiplier = Math.min(Math.pow(2, errorCountRef.current), 6); // Max 6x
    const calculated = baseInterval * errorMultiplier;
    return Math.min(calculated, MAX_POLL_INTERVAL);
  }, []);

  // Initial sync on mount
  useEffect(() => {
    if (isAuthenticated && user && !isAdmin) {
      syncWithServer(true); // Sync immédiat au mount
    }
  }, [isAuthenticated, user, isAdmin, syncWithServer]);

  // Polling adaptatif
  useEffect(() => {
    if (isAuthenticated && user && !isAdmin) {
      const scheduleNext = () => {
        const interval = getPollInterval();
        intervalRef.current = setTimeout(() => {
          syncWithServer();
          scheduleNext();
        }, interval);
      };
      
      scheduleNext();
    }

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
        intervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isAuthenticated, user, isAdmin, syncWithServer, getPollInterval]);

  return { syncWithServer };
}
