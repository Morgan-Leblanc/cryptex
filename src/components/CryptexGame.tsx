import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  RotateCcw,
  Clock,
  LogOut,
  Zap,
  Check,
  Loader2,
} from 'lucide-react';
import { CryptexWheel } from './CryptexWheel';
import { useGameStore } from '../stores/gameStore';

const WHEEL_COUNT = 6;
const API_BASE = '/api/game';

interface RoundConfig {
  id: number;
  name: string;
  difficulty: string;
  question?: string;
  hints?: string[];
  revealedHints?: number;
}

interface GameInfo {
  gameMode: 'free' | 'controlled';
  currentRound: number;
  roundActive: boolean;
}

export function CryptexGame() {
  const { session, user, completeRound, logout, checkReconnect, accessCode } = useGameStore();
  
  const [rounds, setRounds] = useState<RoundConfig[]>([]);
  const [isLoadingRounds, setIsLoadingRounds] = useState(true);
  const [gameInfo, setGameInfo] = useState<GameInfo>({ gameMode: 'free', currentRound: 0, roundActive: false });
  const [hasFoundCurrentRound, setHasFoundCurrentRound] = useState(false);
  
  // En mode contrôlé, utiliser currentRound du serveur; sinon utiliser session
  const currentRoundIndex = gameInfo.gameMode === 'controlled' 
    ? (gameInfo.currentRound - 1) 
    : (session?.currentRound ?? 0);
  const round = rounds[currentRoundIndex];

  const [wheels, setWheels] = useState<string[]>(Array(WHEEL_COUNT).fill('A'));
  const [isChecking, setIsChecking] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [wheelResults, setWheelResults] = useState<(boolean | null)[]>(Array(WHEEL_COUNT).fill(null));
  const [showSuccess, setShowSuccess] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Fetch game state from API (includes mode info) - avec protection contre les réinitialisations
  const fetchGameState = useCallback(async () => {
    try {
      const response = await fetch(API_BASE);
      if (response.ok) {
        const data = await response.json();
        
        // Ne mettre à jour les rounds que s'ils ont changé (par ID)
        const newRounds = data.rounds || [];
        setRounds(prevRounds => {
          // Comparer par ID pour éviter les réinitialisations inutiles
          if (prevRounds.length === 0 || 
              prevRounds.length !== newRounds.length ||
              prevRounds.some((r, i) => r.id !== newRounds[i]?.id)) {
            return newRounds;
          }
          return prevRounds; // Garder les anciens si identiques
        });
        
        // Mettre à jour gameInfo seulement si ça a vraiment changé
        setGameInfo(prev => {
          const newInfo = {
            gameMode: data.gameMode || 'free',
            currentRound: data.currentRound || 0,
            roundActive: data.roundActive || false,
          };
          
          // Ne mettre à jour que si quelque chose a changé
          if (prev.gameMode !== newInfo.gameMode ||
              prev.currentRound !== newInfo.currentRound ||
              prev.roundActive !== newInfo.roundActive) {
            return newInfo;
          }
          return prev; // Garder l'ancien état
        });
      }
      
      // Also fetch player state to get hasFoundCurrentRound
      if (user?.username) {
        try {
          const playerResponse = await fetch(`${API_BASE}/player/${encodeURIComponent(user.username)}`);
          if (playerResponse.ok) {
            const playerData = await playerResponse.json();
            if (playerData.hasFoundCurrentRound !== undefined) {
              setHasFoundCurrentRound(prev => {
                // Ne mettre à jour que si ça a changé
                return prev !== playerData.hasFoundCurrentRound 
                  ? playerData.hasFoundCurrentRound 
                  : prev;
              });
            }
          }
        } catch {
          // Ignorer les erreurs de player endpoint
        }
      }
    } catch (error) {
      console.error('Failed to fetch game state:', error);
    } finally {
      setIsLoadingRounds(false);
    }
  }, [user?.username]);

  // Fetch initial SEULEMENT - pas de refresh automatique pendant le jeu
  // Une fois dans le jeu, on reste stable pour éviter les interruptions
  useEffect(() => {
    // Fetch initial seulement
    fetchGameState();
    // PAS de visibilitychange listener - on reste stable pendant le jeu
  }, [fetchGameState]);

  // Track current round ID to only reset when it actually changes
  const [lastRoundId, setLastRoundId] = useState<number | null>(null);
  const [lastGameMode, setLastGameMode] = useState<'free' | 'controlled' | null>(null);

  // Reset when round actually changes (not just when reference updates from polling)
  useEffect(() => {
    const roundId = gameInfo.gameMode === 'controlled' 
      ? gameInfo.currentRound 
      : (round?.id ?? null);
    
    // Only reset if the round ID OR game mode actually changed
    const roundChanged = roundId !== null && roundId !== lastRoundId;
    const modeChanged = gameInfo.gameMode !== lastGameMode;
    
    if (roundChanged || modeChanged) {
      setLastRoundId(roundId);
      setLastGameMode(gameInfo.gameMode);
      
      // Seulement reset si on change vraiment de round (pas juste un refresh)
      if (roundChanged) {
        setWheels(Array(WHEEL_COUNT).fill('A'));
        setWheelResults(Array(WHEEL_COUNT).fill(null));
        setShowSuccess(false);
        setHasFoundCurrentRound(false);
        setStartTime(Date.now());
      }
    }
  }, [gameInfo.currentRound, gameInfo.gameMode, round?.id, lastRoundId, lastGameMode]);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  // Si pas de session mais on a un user et accessCode, essayer de restaurer
  useEffect(() => {
    if (!session && user && accessCode && !isRestoring) {
      setIsRestoring(true);
      checkReconnect().finally(() => {
        setIsRestoring(false);
      });
    }
  }, [session, user, accessCode, checkReconnect, isRestoring]);

  // Polling en mode contrôlé: détecter le lancement de manche ou passage à la suivante
  // Ce useEffect est TOUJOURS appelé (pas conditionnel) mais le polling est activé conditionnellement
  useEffect(() => {
    const needsPolling = gameInfo.gameMode === 'controlled' && 
      ((!gameInfo.roundActive || gameInfo.currentRound === 0) || hasFoundCurrentRound);
    
    if (!needsPolling) return;
    
    const interval = setInterval(() => {
      fetchGameState();
    }, 3000);
    
    return () => clearInterval(interval);
  }, [gameInfo.gameMode, gameInfo.roundActive, gameInfo.currentRound, hasFoundCurrentRound, fetchGameState]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleWheelChange = useCallback((index: number, letter: string) => {
    setWheels((prev) => {
      const newWheels = [...prev];
      newWheels[index] = letter;
      return newWheels;
    });
    setWheelResults((prev) => {
      const newResults = [...prev];
      newResults[index] = null;
      return newResults;
    });
  }, []);

  const checkSolution = async () => {
    if (!round) return;
    
    setIsChecking(true);
    const attempt = wheels.join('');

    try {
      // Check solution via API
      const response = await fetch(`${API_BASE}?action=check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: user?.username,
          roundId: round.id,
          solution: attempt,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.correct && data.solution) {
          // Show correct letters
          const solution = data.solution;
          const results = wheels.map((letter, i) => letter === solution[i]);
          setWheelResults(results);
          setShowSuccess(true);

          // Register completion on server
          await fetch(`${API_BASE}?action=complete-round`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: user?.username,
              roundId: round.id,
              timeSeconds: elapsed,
            }),
          });

          // Rafraîchir l'état après avoir complété
          fetchGameState();

          if (gameInfo.gameMode === 'controlled') {
            // Mode contrôlé: marquer comme trouvé, attendre la prochaine manche
            setHasFoundCurrentRound(true);
          } else {
            // Mode libre: passer à la manche suivante après 2 secondes
            setTimeout(() => {
              completeRound(currentRoundIndex, 0);
              fetchGameState(); // Rafraîchir après changement de round
            }, 2000);
          }
        } else {
          // Mauvaise réponse
          setWheelResults(Array(WHEEL_COUNT).fill(false));
        }
      }
    } catch (error) {
      console.error('Failed to check solution:', error);
    } finally {
      setTimeout(() => {
        setIsChecking(false);
      }, 800);
    }
  };

  const resetWheels = () => {
    setWheels(Array(WHEEL_COUNT).fill('A'));
    setWheelResults(Array(WHEEL_COUNT).fill(null));
  };

  const handleLogout = async () => {
    await logout();
  };

  if (isLoadingRounds) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-texture">
        <div className="torch-glow absolute inset-0 pointer-events-none" />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 rounded-full"
          style={{
            background: 'conic-gradient(from 0deg, #3d1f08, #8b4513, #d4af37, #8b4513, #3d1f08)',
            boxShadow: '0 0 30px rgba(212, 175, 55, 0.3)',
          }}
        >
          <div className="w-full h-full rounded-full flex items-center justify-center bg-stone-950/80">
            <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
          </div>
        </motion.div>
      </div>
    );
  }

  if (!session && user && accessCode) {
    // Afficher un loader pendant la restauration
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-stone-texture">
        <div className="torch-glow absolute inset-0 pointer-events-none" />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 rounded-full"
          style={{
            background: 'conic-gradient(from 0deg, #3d1f08, #8b4513, #d4af37, #8b4513, #3d1f08)',
            boxShadow: '0 0 30px rgba(212, 175, 55, 0.3)',
          }}
        >
          <div className="w-full h-full rounded-full flex items-center justify-center bg-stone-950/80">
            <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
          </div>
        </motion.div>
        <p className="text-amber-400 mt-4">Restauration de la session...</p>
      </div>
    );
  }

  // Si vraiment pas de user, alors on peut afficher l'erreur
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-stone-texture">
        <div className="torch-glow absolute inset-0 pointer-events-none" />
        <div className="text-center">
          <p className="text-amber-400 mb-4">Session expirée ou invalide</p>
          <button
            onClick={handleLogout}
            className="px-6 py-3 rounded-lg bg-amber-600 text-stone-900 font-display font-semibold"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  if (gameInfo.gameMode === 'controlled' && (!gameInfo.roundActive || gameInfo.currentRound === 0)) {
    return (
      <div className="min-h-screen min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-stone-texture relative overflow-hidden">
        <div className="torch-glow absolute inset-0 pointer-events-none" />
        
        {/* Animated mystical rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full border border-amber-700/20"
              style={{ width: 150 + i * 100, height: 150 + i * 100 }}
              animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
              transition={{ duration: 20 + i * 10, repeat: Infinity, ease: 'linear' }}
            />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 text-center max-w-md"
        >
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="relative w-24 h-24 mx-auto mb-6"
          >
            <div 
              className="w-full h-full rounded-full flex items-center justify-center"
              style={{
                background: 'conic-gradient(from 0deg, #3d1f08, #8b4513, #cd7f32, #8b4513, #3d1f08)',
                boxShadow: '0 0 40px rgba(212, 175, 55, 0.25)',
              }}
            >
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'radial-gradient(circle at 30% 30%, #2a2418, #0f0d0a)' }}
              >
                <Clock className="w-8 h-8 text-amber-500" />
              </div>
            </div>
          </motion.div>
          
          <h2 
            className="font-display text-2xl sm:text-3xl font-bold mb-3 tracking-wide"
            style={{
              background: 'linear-gradient(180deg, #f5ede0 0%, #d4af37 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {gameInfo.currentRound === 0 ? "Les rouages s'activent..." : `Épreuve ${gameInfo.currentRound} accomplie`}
          </h2>
          <p className="text-amber-600/80 mb-8 font-body italic">
            {gameInfo.currentRound === 0 
              ? "Le gardien prépare la première énigme..." 
              : "Le gardien prépare la prochaine énigme..."
            }
          </p>
          <button
            onClick={handleLogout}
            className="px-5 py-2.5 rounded-lg bg-stone-900/80 border border-stone-700 text-stone-400 hover:text-red-400 hover:border-red-800 transition-all font-display text-sm uppercase tracking-wider"
          >
            <LogOut className="w-4 h-4 inline mr-2" />
            Abandonner
          </button>
        </motion.div>
      </div>
    );
  }

  if (gameInfo.gameMode === 'controlled' && hasFoundCurrentRound) {
    return (
      <div className="min-h-screen min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-stone-texture relative overflow-hidden">
        <div className="torch-glow absolute inset-0 pointer-events-none" />
        
        {/* Victory particles */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{
              background: i % 2 === 0 ? '#d4af37' : '#22c55e',
              left: `${20 + Math.random() * 60}%`,
              bottom: '40%',
            }}
            initial={{ opacity: 0, y: 0, scale: 0 }}
            animate={{ 
              opacity: [0, 1, 1, 0],
              y: [-50, -150 - Math.random() * 100],
              scale: [0, 1, 1, 0],
              x: [0, (Math.random() - 0.5) * 100],
            }}
            transition={{
              duration: 2,
              delay: i * 0.1,
              repeat: Infinity,
              repeatDelay: 3,
            }}
          />
        ))}

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 text-center max-w-md"
        >
          <motion.div
            initial={{ rotate: 0, scale: 0 }}
            animate={{ rotate: [0, 10, -10, 5, 0], scale: 1 }}
            transition={{ duration: 0.8 }}
            className="relative w-28 h-28 mx-auto mb-6"
          >
            <div 
              className="w-full h-full rounded-full flex items-center justify-center"
              style={{
                background: 'conic-gradient(from 0deg, #166534, #22c55e, #4ade80, #22c55e, #166534)',
                boxShadow: '0 0 50px rgba(34, 197, 94, 0.4)',
              }}
            >
              <div 
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: 'radial-gradient(circle at 30% 30%, #166534, #052e16)' }}
              >
                <Trophy className="w-10 h-10 text-green-300" />
              </div>
            </div>
          </motion.div>
          
          <motion.h2 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="font-display text-3xl font-bold text-green-400 mb-2 tracking-wide"
          >
            Victoire !
          </motion.h2>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-amber-100 mb-2 text-lg"
          >
            Épreuve {gameInfo.currentRound} résolue !
          </motion.p>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-amber-600/80 font-body italic mb-6"
          >
            Le gardien prépare la suite de votre quête...
          </motion.p>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex items-center justify-center gap-2 text-amber-700"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-body">En attente du gardien</span>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  if (!round) {
    // Afficher un écran de chargement au lieu d'un écran noir
    return (
      <div className="min-h-screen min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-stone-texture relative overflow-hidden">
        <div className="torch-glow absolute inset-0 pointer-events-none" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            className="w-20 h-20 mx-auto mb-6 rounded-full"
            style={{
              background: 'conic-gradient(from 0deg, #3d1f08, #8b4513, #d4af37, #8b4513, #3d1f08)',
              boxShadow: '0 0 40px rgba(212, 175, 55, 0.3)',
            }}
          >
            <div className="w-full h-full rounded-full flex items-center justify-center bg-stone-950/80">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            </div>
          </motion.div>
          
          <h2 
            className="font-display text-xl sm:text-2xl font-bold mb-2 tracking-wide"
            style={{
              background: 'linear-gradient(180deg, #f5ede0 0%, #d4af37 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Préparation des épreuves...
          </h2>
          <p className="text-amber-600/80 font-body mb-6">
            Les rouages du cryptex s'activent
          </p>
          
          <button
            onClick={() => fetchGameState()}
            className="px-5 py-2.5 rounded-lg font-display text-sm uppercase tracking-wider transition-all"
            style={{
              background: 'linear-gradient(135deg, #8b6914 0%, #6b4f0f 100%)',
              boxShadow: '0 4px 15px rgba(139, 105, 20, 0.3)',
            }}
          >
            <span className="text-amber-100">Réessayer</span>
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col relative overflow-hidden bg-stone-texture">
      {/* Torch glow effect */}
      <div className="torch-glow absolute inset-0 pointer-events-none" />

      {/* Decorative corner runes */}
      <div className="absolute top-4 left-4 text-2xl text-amber-700/20 hidden sm:block">𓊽</div>
      <div className="absolute top-4 right-4 text-2xl text-amber-700/20 hidden sm:block">𓋹</div>

      {/* Header */}
      <header className="relative z-10 p-3 sm:p-4 border-b border-amber-900/30 bg-stone-950/50 backdrop-blur-sm">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div 
              className="w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #d4af37 0%, #8b6914 100%)',
                boxShadow: '0 4px 15px rgba(212, 175, 55, 0.3)',
              }}
            >
              <span className="text-sm sm:text-base font-display font-bold text-stone-900">
                {user.username.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-amber-100 text-sm sm:text-base font-display font-semibold">
                {user.username}
              </p>
              <p className="text-amber-700 text-xs hidden sm:block">Explorateur</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div 
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
              style={{
                background: 'linear-gradient(135deg, #2a2418 0%, #1a1612 100%)',
                border: '1px solid #3d2e1f',
              }}
            >
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="font-display text-amber-300 text-sm tracking-wider">{formatTime(elapsed)}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-amber-700 hover:text-red-400 hover:bg-red-900/20 transition-all"
              title="Abandonner"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
        {/* Round info */}
        <motion.div
          key={round.id}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-4 sm:mb-6"
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-amber-700 text-xs uppercase tracking-[0.2em] font-display">
              Épreuve {round.id} sur 6
            </span>
            <span 
              className="px-2.5 py-0.5 text-xs rounded-full font-display uppercase tracking-wider"
              style={{
                background: round.difficulty === 'Expert' 
                  ? 'linear-gradient(135deg, #7f1d1d, #450a0a)'
                  : round.difficulty === 'Difficile'
                    ? 'linear-gradient(135deg, #78350f, #451a03)'
                    : 'linear-gradient(135deg, #3d2e1f, #1a1510)',
                border: '1px solid',
                borderColor: round.difficulty === 'Expert' 
                  ? '#991b1b'
                  : round.difficulty === 'Difficile'
                    ? '#92400e'
                    : '#8b4513',
                color: round.difficulty === 'Expert' 
                  ? '#fca5a5'
                  : round.difficulty === 'Difficile'
                    ? '#fbbf24'
                    : '#d4af37',
              }}
            >
              {round.difficulty}
            </span>
          </div>
          <h2 
            className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-wide"
            style={{
              background: 'linear-gradient(180deg, #f5ede0 0%, #d4af37 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {round.name}
          </h2>
          
          {/* Énoncé de l'énigme */}
          {round.question && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-4 px-4 py-3 rounded-lg max-w-md mx-auto"
              style={{
                background: 'linear-gradient(135deg, rgba(42, 36, 24, 0.8) 0%, rgba(26, 22, 18, 0.8) 100%)',
                border: '1px solid #3d2e1f',
              }}
            >
              <p className="text-amber-200/90 text-sm sm:text-base font-body italic leading-relaxed">
                « {round.question} »
              </p>
            </motion.div>
          )}

          {/* Indices révélés */}
          {round.hints && round.hints.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-3 max-w-md mx-auto"
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-amber-500 text-sm">💡 Indices</span>
              </div>
              <div className="space-y-1.5">
                {round.hints.map((hint, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className="px-3 py-2 rounded-lg text-sm"
                    style={{
                      background: 'linear-gradient(135deg, rgba(139, 69, 19, 0.2) 0%, rgba(61, 31, 8, 0.2) 100%)',
                      border: '1px solid rgba(184, 115, 51, 0.3)',
                    }}
                  >
                    <span className="text-amber-400 mr-2">{i + 1}.</span>
                    <span className="text-amber-200/80">{hint}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Progress - Ancient stone tablets */}
        <div className="flex gap-1.5 mb-4 sm:mb-6">
          {rounds.map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, rotateY: 180 }}
              animate={{ scale: 1, rotateY: 0 }}
              transition={{ delay: i * 0.08, type: 'spring' }}
              className={`
                w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center font-display font-bold text-sm
                transition-all duration-300
              `}
              style={{
                background: i === currentRoundIndex
                  ? 'linear-gradient(135deg, #d4af37 0%, #8b6914 100%)'
                  : session?.roundsCompleted[i]
                    ? 'linear-gradient(135deg, #166534 0%, #052e16 100%)'
                    : 'linear-gradient(135deg, #2a2418 0%, #1a1612 100%)',
                border: '2px solid',
                borderColor: i === currentRoundIndex
                  ? '#d4af37'
                  : session?.roundsCompleted[i]
                    ? '#22c55e'
                    : '#3d2e1f',
                boxShadow: i === currentRoundIndex
                  ? '0 0 15px rgba(212, 175, 55, 0.4)'
                  : session?.roundsCompleted[i]
                    ? '0 0 10px rgba(34, 197, 94, 0.3)'
                    : 'none',
                color: i === currentRoundIndex
                  ? '#1a1612'
                  : session?.roundsCompleted[i]
                    ? '#4ade80'
                    : '#5c4d3d',
              }}
            >
              {session?.roundsCompleted[i] ? '✓' : i + 1}
            </motion.div>
          ))}
        </div>

        {/* CRYPTEX - Da Vinci Style */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`
            relative p-3 sm:p-4 md:p-5
            ${showSuccess ? 'animate-pulse' : ''}
          `}
        >
          {/* Cylindrical frame - outer brass casing */}
          <div 
            className="relative rounded-2xl p-3 sm:p-4"
            style={{
              background: `
                linear-gradient(180deg,
                  #8B7355 0%,
                  #CD853F 5%,
                  #DEB887 15%,
                  #D2B48C 25%,
                  #CD853F 40%,
                  #8B7355 60%,
                  #654321 80%,
                  #4A3728 95%,
                  #3D2E1F 100%
                )
              `,
              boxShadow: `
                0 20px 40px rgba(0,0,0,0.5),
                0 10px 20px rgba(0,0,0,0.3),
                inset 0 2px 4px rgba(255,255,255,0.2),
                inset 0 -4px 8px rgba(0,0,0,0.3)
              `,
            }}
          >
            {/* Inner shadow overlay */}
            <div 
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                boxShadow: 'inset 0 0 30px rgba(0,0,0,0.4)',
              }}
            />

            {/* End cap left */}
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-3 sm:w-4 h-20 sm:h-24 rounded-l-full"
              style={{
                background: 'linear-gradient(90deg, #4A3728, #8B7355, #CD853F)',
                boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)',
              }}
            />
            
            {/* End cap right */}
            <div 
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 w-3 sm:w-4 h-20 sm:h-24 rounded-r-full"
              style={{
                background: 'linear-gradient(270deg, #4A3728, #8B7355, #CD853F)',
                boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)',
              }}
            />

            {/* Decorative rings on ends */}
            <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1 h-16 sm:h-20 rounded-full bg-gradient-to-b from-amber-600/50 via-amber-400/30 to-amber-600/50" />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1 h-16 sm:h-20 rounded-full bg-gradient-to-b from-amber-600/50 via-amber-400/30 to-amber-600/50" />

            {/* Wheels container */}
            <div className="flex gap-1 sm:gap-1.5 md:gap-2 relative z-10">
              {wheels.map((letter, index) => (
                <CryptexWheel
                  key={`${round.id}-${index}`}
                  currentLetter={letter}
                  onChange={(l) => handleWheelChange(index, l)}
                  isLocked={showSuccess}
                  isCorrect={wheelResults[index] ?? undefined}
                  index={index}
                />
              ))}
            </div>

            {/* Center alignment bar */}
            <div 
              className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-0.5 pointer-events-none z-20"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,200,100,0.3), transparent)',
              }}
            />
          </div>

          {/* Glow effect when successful */}
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                boxShadow: '0 0 60px rgba(74, 222, 128, 0.4), 0 0 100px rgba(74, 222, 128, 0.2)',
              }}
            />
          )}
        </motion.div>

        {/* Swipe hint for mobile */}
        <p className="text-amber-700 text-xs mt-3 sm:hidden">
          ↕ Glissez pour changer les lettres
        </p>

        {/* Actions */}
        <div className="flex gap-2 sm:gap-3 mt-6 sm:mt-8">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={resetWheels}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl font-display text-sm sm:text-base bg-stone-800/80 border border-stone-700 text-stone-400 hover:text-stone-300 hover:border-stone-600 active:bg-stone-700 transition-all"
          >
            <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Reset</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={checkSolution}
            disabled={isChecking || showSuccess}
            className={`
              flex items-center gap-1.5 sm:gap-2 px-5 sm:px-8 py-2.5 sm:py-3 rounded-xl font-display font-semibold text-sm sm:text-base
              transition-all duration-300
              ${isChecking || showSuccess
                ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-600 to-amber-700 text-stone-950 hover:from-amber-500 hover:to-amber-600 shadow-lg shadow-amber-900/30 active:shadow-none'
              }
            `}
          >
            {isChecking ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
                </motion.div>
                <span>...</span>
              </>
            ) : showSuccess ? (
              <>
                <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Réussi!</span>
              </>
            ) : (
              <>
                <span>Valider</span>
              </>
            )}
          </motion.button>
        </div>
      </main>

      {/* Success overlay */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/90 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="text-center"
            >
              <motion.div
                animate={{
                  rotate: [0, 10, -10, 10, 0],
                  scale: [1, 1.1, 1, 1.1, 1],
                }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-green-400 to-green-600 mb-4 sm:mb-6 shadow-2xl shadow-green-500/30"
              >
                <Trophy className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
              </motion.div>
              <h3 className="font-display text-3xl sm:text-4xl font-bold text-green-400 mb-2">
                Manche Réussie!
              </h3>
              <p className="text-stone-400 text-sm sm:text-base">
                Passage à la manche suivante...
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
