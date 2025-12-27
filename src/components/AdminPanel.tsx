import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  Play,
  Square,
  Users,
  Edit3,
  Save,
  X,
  RotateCcw,
  LogOut,
  Eye,
  EyeOff,
  Crown,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useGameStore } from '../stores/gameStore';

const API_BASE = '/api/game';
const POLL_INTERVAL = 2000;

interface RoundConfig {
  id: number;
  name: string;
  solution: string;
  difficulty: 'Facile' | 'Moyen' | 'Difficile' | 'Expert';
  question: string;
  hints?: string[];
}

interface PlayerProgress {
  username: string;
  currentRound: number;
  roundsCompleted: number;
  isFinished: boolean;
  totalTime: number;
  hasFoundCurrentRound?: boolean;
  avatar?: string;
}

interface RoundWinner {
  username: string;
  time: number;
}

interface GameState {
  id: string;
  rounds: RoundConfig[];
  isStarted: boolean;
  startedAt: string | null;
  createdAt: string;
  connectedPlayers: string[];
  leaderboard?: PlayerProgress[];
  // Mode de jeu
  gameMode: 'free' | 'controlled';
  currentRound: number;
  roundActive: boolean;
  roundWinners?: RoundWinner[];
  totalWinners?: number;
  // Indices révélés par manche
  revealedHints?: number[];
}

export function AdminPanel() {
  const { logout } = useGameStore();
  
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  const [editingRound, setEditingRound] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<RoundConfig>>({});
  const [showSolutions, setShowSolutions] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // Fetch game state
  const fetchGameState = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}?admin=true`);
      if (response.ok) {
        const data = await response.json();
        setGameState(data);
      }
    } catch (error) {
      console.error('Failed to fetch game state:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Poll for updates
  useEffect(() => {
    fetchGameState();
    const interval = setInterval(fetchGameState, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchGameState]);

  const handleEditRound = (round: RoundConfig) => {
    setEditingRound(round.id);
    setEditForm({
      name: round.name,
      solution: round.solution,
      difficulty: round.difficulty,
      question: round.question,
      hints: round.hints || ['', '', ''],
    });
  };

  const handleRevealHint = async (roundId: number) => {
    setActionLoading(`hint-${roundId}`);
    try {
      const response = await fetch(`${API_BASE}?action=reveal-hint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roundId }),
      });
      if (response.ok) {
        await fetchGameState();
      }
    } catch (error) {
      console.error('Failed to reveal hint:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveRound = async () => {
    if (!editingRound || !editForm.solution) return;
    
    setActionLoading('save');
    try {
      const solution = editForm.solution.toUpperCase().slice(0, 6).padEnd(6, 'A');
      const response = await fetch(API_BASE, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roundId: editingRound,
          updates: { ...editForm, solution },
        }),
      });
      
      if (response.ok) {
        await fetchGameState();
        setEditingRound(null);
        setEditForm({});
      }
    } catch (error) {
      console.error('Failed to save round:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingRound(null);
    setEditForm({});
  };

  const handleStartGame = async () => {
    setActionLoading('start');
    try {
      const response = await fetch(`${API_BASE}?action=start`, {
        method: 'POST',
      });
      if (response.ok) {
        await fetchGameState();
      }
    } catch (error) {
      console.error('Failed to start game:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStopGame = async () => {
    setActionLoading('stop');
    try {
      const response = await fetch(`${API_BASE}?action=stop`, {
        method: 'POST',
      });
      if (response.ok) {
        await fetchGameState();
      }
    } catch (error) {
      console.error('Failed to stop game:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReset = async () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 3000);
      return;
    }
    
    setActionLoading('reset');
    try {
      const response = await fetch(`${API_BASE}?action=reset`, {
        method: 'POST',
      });
      if (response.ok) {
        await fetchGameState();
        setConfirmReset(false);
      }
    } catch (error) {
      console.error('Failed to reset game:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSetMode = async (mode: 'free' | 'controlled') => {
    setActionLoading('mode');
    try {
      const response = await fetch(`${API_BASE}?action=set-mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      if (response.ok) {
        await fetchGameState();
      }
    } catch (error) {
      console.error('Failed to set mode:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleLaunchRound = async () => {
    setActionLoading('launch');
    try {
      const response = await fetch(`${API_BASE}?action=launch-round`, {
        method: 'POST',
      });
      if (response.ok) {
        await fetchGameState();
      }
    } catch (error) {
      console.error('Failed to launch round:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleEndRound = async () => {
    setActionLoading('endRound');
    try {
      const response = await fetch(`${API_BASE}?action=end-round`, {
        method: 'POST',
      });
      if (response.ok) {
        await fetchGameState();
      }
    } catch (error) {
      console.error('Failed to end round:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  if (isLoading || !gameState) {
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

  return (
    <div className="min-h-screen min-h-[100dvh] bg-stone-texture text-amber-100">
      {/* Torch glow */}
      <div className="torch-glow fixed inset-0 pointer-events-none" />
      
      {/* Header */}
      <header 
        className="sticky top-0 z-20 border-b border-amber-900/30 p-4 backdrop-blur-sm"
        style={{ background: 'rgba(15, 13, 10, 0.9)' }}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                background: 'conic-gradient(from 0deg, #8b4513, #d4af37, #ffd700, #d4af37, #8b4513)',
                boxShadow: '0 0 20px rgba(212, 175, 55, 0.4)',
              }}
            >
              <div 
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: 'radial-gradient(circle at 30% 30%, #8b4513, #3d1f08)' }}
              >
                <Crown className="w-5 h-5 text-amber-200" />
              </div>
            </div>
            <div>
              <h1 
                className="font-display text-xl font-bold tracking-wide"
                style={{
                  background: 'linear-gradient(180deg, #f5ede0 0%, #d4af37 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Salle du Gardien
              </h1>
              <p className="text-xs text-amber-600">Maître des Énigmes</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchGameState}
              className="p-2.5 rounded-lg bg-stone-900/80 border border-stone-700 text-stone-400 hover:text-amber-400 hover:border-amber-800 transition-all"
              title="Rafraîchir"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-stone-900/80 border border-stone-700 text-stone-400 hover:text-red-400 hover:border-red-800 transition-all font-display text-sm uppercase tracking-wider"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Quitter</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Game Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-stone-900/50 border border-stone-800 rounded-xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <Settings className="w-5 h-5 text-amber-500" />
              État de la Partie
            </h2>
            <div
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                gameState.isStarted
                  ? 'bg-green-900/50 text-green-400 border border-green-700'
                  : 'bg-amber-900/50 text-amber-400 border border-amber-700'
              }`}
            >
              {gameState.isStarted ? '🟢 En cours' : '🟡 En attente'}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-stone-800/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-amber-400">6</div>
              <div className="text-xs text-stone-500">Manches</div>
            </div>
            <div className="bg-stone-800/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-amber-400">
                {gameState.connectedPlayers.length}
              </div>
              <div className="text-xs text-stone-500">Joueurs</div>
            </div>
            <div className="bg-stone-800/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-amber-400">6</div>
              <div className="text-xs text-stone-500">Lettres</div>
            </div>
            <div className="bg-stone-800/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-amber-400">
                {gameState.startedAt
                  ? new Date(gameState.startedAt).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '--:--'}
              </div>
              <div className="text-xs text-stone-500">Démarré à</div>
            </div>
          </div>

          {/* Mode de jeu */}
          <div className="mb-4 p-3 bg-stone-800/50 rounded-lg">
            <label className="text-xs text-stone-500 mb-2 block">Mode de jeu</label>
            <div className="flex gap-2">
              <button
                onClick={() => handleSetMode('free')}
                disabled={gameState.isStarted || actionLoading === 'mode'}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  gameState.gameMode === 'free'
                    ? 'bg-amber-600 text-stone-900'
                    : 'bg-stone-700 text-stone-400 hover:bg-stone-600'
                } disabled:opacity-50`}
              >
                🏃 Mode Libre
              </button>
              <button
                onClick={() => handleSetMode('controlled')}
                disabled={gameState.isStarted || actionLoading === 'mode'}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  gameState.gameMode === 'controlled'
                    ? 'bg-amber-600 text-stone-900'
                    : 'bg-stone-700 text-stone-400 hover:bg-stone-600'
                } disabled:opacity-50`}
              >
                🎮 Mode Contrôlé
              </button>
            </div>
            <p className="text-xs text-stone-500 mt-2">
              {gameState.gameMode === 'free' 
                ? "Chaque joueur avance à son propre rythme"
                : "Vous contrôlez quand chaque manche démarre pour tout le monde"
              }
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            {!gameState.isStarted ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleStartGame}
                disabled={actionLoading === 'start'}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-display font-semibold bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg shadow-green-900/30 hover:from-green-500 hover:to-green-600 transition-all disabled:opacity-50"
              >
                {actionLoading === 'start' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
                Lancer la Partie
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleStopGame}
                disabled={actionLoading === 'stop'}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-display font-semibold bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-900/30 hover:from-red-500 hover:to-red-600 transition-all disabled:opacity-50"
              >
                {actionLoading === 'stop' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Square className="w-5 h-5" />
                )}
                Arrêter
              </motion.button>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleReset}
              disabled={actionLoading === 'reset'}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-display transition-all disabled:opacity-50 ${
                confirmReset
                  ? 'bg-red-900 border-2 border-red-500 text-red-200 shadow-lg shadow-red-900/50'
                  : 'bg-gradient-to-r from-orange-900 to-red-900 border border-orange-700 text-orange-200 hover:from-orange-800 hover:to-red-800'
              }`}
            >
              {actionLoading === 'reset' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : confirmReset ? (
                <>
                  <AlertCircle className="w-5 h-5 animate-pulse" />
                  Confirmer Reset Total?
                </>
              ) : (
                <>
                  <RotateCcw className="w-5 h-5" />
                  Reset Partie
                </>
              )}
            </motion.button>
          </div>

          {/* Info box about single game */}
          <div className="mt-4 p-3 bg-amber-900/20 border border-amber-700/30 rounded-lg">
            <p className="text-xs text-amber-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>
                <strong>Une seule partie active à la fois.</strong> Utilisez "Reset Partie" pour tout recommencer et permettre à de nouveaux joueurs de rejoindre.
              </span>
            </p>
          </div>

          {/* Contrôle des manches (mode contrôlé) */}
          {gameState.isStarted && gameState.gameMode === 'controlled' && (
            <div className="mt-4 p-4 bg-amber-900/20 border border-amber-700/50 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-semibold text-amber-200">
                  🎯 Contrôle des Manches
                </h3>
                <span className="text-sm text-amber-400">
                  Manche {gameState.currentRound}/6
                </span>
              </div>

              {gameState.currentRound === 0 ? (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleLaunchRound}
                  disabled={actionLoading === 'launch'}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-display font-semibold bg-gradient-to-r from-amber-500 to-amber-600 text-stone-900 shadow-lg shadow-amber-900/30 hover:from-amber-400 hover:to-amber-500 transition-all disabled:opacity-50"
                >
                  {actionLoading === 'launch' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Play className="w-5 h-5" />
                  )}
                  Lancer la Manche 1
                </motion.button>
              ) : gameState.roundActive ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-green-400">🟢 Manche {gameState.currentRound} en cours</span>
                    <span className="text-amber-400">{gameState.totalWinners || 0} joueur(s) ont trouvé</span>
                  </div>

                  {/* Contrôle des indices */}
                  {(() => {
                    const roundIndex = gameState.currentRound - 1;
                    const currentRoundData = gameState.rounds[roundIndex];
                    const hintsRevealed = gameState.revealedHints?.[roundIndex] || 0;
                    const totalHints = currentRoundData?.hints?.length || 0;
                    
                    return (
                      <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-amber-400 font-semibold">💡 Indices</span>
                          <span className="text-xs text-amber-600">{hintsRevealed}/{totalHints} révélés</span>
                        </div>
                        
                        {/* Indices déjà révélés */}
                        {hintsRevealed > 0 && (
                          <div className="space-y-1 mb-2">
                            {currentRoundData?.hints?.slice(0, hintsRevealed).map((hint, i) => (
                              <div key={i} className="text-xs text-amber-200 bg-stone-800/50 px-2 py-1 rounded">
                                {i + 1}. {hint}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Bouton pour révéler le prochain indice */}
                        {hintsRevealed < totalHints && (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleRevealHint(gameState.currentRound)}
                            disabled={actionLoading === `hint-${gameState.currentRound}`}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-amber-700 text-amber-100 text-sm hover:bg-amber-600 transition-all disabled:opacity-50"
                          >
                            {actionLoading === `hint-${gameState.currentRound}` ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>💡 Révéler l'indice {hintsRevealed + 1}</>
                            )}
                          </motion.button>
                        )}
                        
                        {hintsRevealed >= totalHints && totalHints > 0 && (
                          <p className="text-xs text-amber-600 text-center">Tous les indices ont été révélés</p>
                        )}
                      </div>
                    );
                  })()}
                  
                  {/* Liste des gagnants de la manche */}
                  {gameState.roundWinners && gameState.roundWinners.length > 0 && (
                    <div className="bg-stone-800/50 rounded-lg p-2">
                      <div className="text-xs text-stone-500 mb-1">Ont trouvé:</div>
                      <div className="flex flex-wrap gap-1">
                        {gameState.roundWinners.map((w, i) => (
                          <span key={w.username} className="text-xs px-2 py-0.5 rounded bg-green-900/50 text-green-400">
                            #{i+1} {w.username} ({w.time}s)
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleEndRound}
                      disabled={actionLoading === 'endRound'}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-stone-700 text-stone-300 hover:bg-stone-600 transition-all disabled:opacity-50"
                    >
                      {actionLoading === 'endRound' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                      Terminer la manche
                    </motion.button>
                  </div>
                </div>
              ) : gameState.currentRound < 6 ? (
                <div className="space-y-3">
                  <p className="text-sm text-stone-400">
                    Manche {gameState.currentRound} terminée. {gameState.totalWinners || 0} joueur(s) ont trouvé.
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleLaunchRound}
                    disabled={actionLoading === 'launch'}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-display font-semibold bg-gradient-to-r from-amber-500 to-amber-600 text-stone-900 shadow-lg shadow-amber-900/30 hover:from-amber-400 hover:to-amber-500 transition-all disabled:opacity-50"
                  >
                    {actionLoading === 'launch' ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Play className="w-5 h-5" />
                    )}
                    Lancer la Manche {gameState.currentRound + 1}
                  </motion.button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <span className="text-2xl mb-2 block">🏆</span>
                  <p className="text-green-400 font-semibold">Toutes les manches sont terminées!</p>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Connected Players */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-stone-900/50 border border-stone-800 rounded-xl p-5"
        >
          <h2 className="font-display text-lg font-semibold flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-amber-500" />
            Joueurs Connectés ({gameState.connectedPlayers.length})
          </h2>

          {gameState.connectedPlayers.length === 0 ? (
            <p className="text-stone-500 text-sm">
              Aucun joueur connecté pour le moment...
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {gameState.connectedPlayers.map((player) => (
                <div
                  key={player}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-800 border border-stone-700"
                >
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm text-amber-200">{player}</span>
                </div>
              ))}
            </div>
          )}

          {/* Leaderboard - Progression des joueurs */}
          {gameState.leaderboard && gameState.leaderboard.length > 0 && (
            <div className="mt-6 pt-4 border-t border-stone-700">
              <h3 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
                <Crown className="w-4 h-4" />
                Progression des Joueurs
              </h3>
              <div className="space-y-2">
                {gameState.leaderboard.map((player, index) => (
                  <div
                    key={player.username}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                      player.isFinished
                        ? 'bg-green-900/30 border border-green-700'
                        : 'bg-stone-800/50 border border-stone-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-lg font-bold ${
                        index === 0 ? 'text-amber-400' : 
                        index === 1 ? 'text-stone-400' :
                        index === 2 ? 'text-amber-700' : 'text-stone-500'
                      }`}>
                        #{index + 1}
                      </span>
                      {player.avatar ? (
                        <img 
                          src={player.avatar} 
                          alt={player.username}
                          className="w-8 h-8 rounded-full object-cover border border-amber-600"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-stone-700 flex items-center justify-center text-amber-400 text-sm font-bold">
                          {player.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-amber-100">{player.username}</span>
                      {player.isFinished && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-700 text-green-100">
                          Terminé!
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-semibold text-amber-300">
                          Énigme {player.roundsCompleted < 6 ? player.roundsCompleted + 1 : 6}/6
                        </div>
                        <div className="text-xs text-stone-500">
                          {player.roundsCompleted} complétée{player.roundsCompleted > 1 ? 's' : ''}
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="w-20 h-2 bg-stone-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            player.isFinished ? 'bg-green-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${(player.roundsCompleted / 6) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Rounds Configuration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-stone-900/50 border border-stone-800 rounded-xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-amber-500" />
              Configuration des Manches
            </h2>
            <button
              onClick={() => setShowSolutions(!showSolutions)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-400 hover:text-amber-400 transition-all text-sm"
            >
              {showSolutions ? (
                <>
                  <EyeOff className="w-4 h-4" />
                  Masquer
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  Voir solutions
                </>
              )}
            </button>
          </div>

          <div className="space-y-3">
            {gameState.rounds.map((round) => (
              <div
                key={round.id}
                className="bg-stone-800/50 border border-stone-700 rounded-lg p-4"
              >
                {editingRound === round.id ? (
                  /* Edit Mode */
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-stone-500 mb-1 block">
                          Nom de la manche
                        </label>
                        <input
                          type="text"
                          value={editForm.name || ''}
                          onChange={(e) =>
                            setEditForm({ ...editForm, name: e.target.value })
                          }
                          className="w-full px-3 py-2 bg-stone-900 border border-stone-600 rounded-lg text-amber-100 text-sm focus:border-amber-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-stone-500 mb-1 block">
                          Solution (6 lettres)
                        </label>
                        <input
                          type="text"
                          value={editForm.solution || ''}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              solution: e.target.value.toUpperCase().slice(0, 6),
                            })
                          }
                          maxLength={6}
                          className="w-full px-3 py-2 bg-stone-900 border border-stone-600 rounded-lg text-amber-100 text-sm font-mono tracking-wider focus:border-amber-500 outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-stone-500 mb-1 block">
                        Difficulté
                      </label>
                      <select
                        value={editForm.difficulty || 'Moyen'}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            difficulty: e.target.value as RoundConfig['difficulty'],
                          })
                        }
                        className="w-full px-3 py-2 bg-stone-900 border border-stone-600 rounded-lg text-amber-100 text-sm focus:border-amber-500 outline-none"
                      >
                        <option value="Facile">Facile</option>
                        <option value="Moyen">Moyen</option>
                        <option value="Difficile">Difficile</option>
                        <option value="Expert">Expert</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-stone-500 mb-1 block">
                        Énoncé / Question
                      </label>
                      <textarea
                        value={editForm.question || ''}
                        onChange={(e) =>
                          setEditForm({ ...editForm, question: e.target.value })
                        }
                        rows={2}
                        placeholder="L'énigme que les joueurs doivent résoudre..."
                        className="w-full px-3 py-2 bg-stone-900 border border-stone-600 rounded-lg text-amber-100 text-sm focus:border-amber-500 outline-none resize-none"
                      />
                    </div>
                    
                    {/* Indices */}
                    <div className="pt-3 border-t border-stone-700">
                      <label className="text-xs text-amber-500 mb-2 block font-semibold">
                        💡 Indices (jusqu'à 3)
                      </label>
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="flex items-center gap-2 mb-2">
                          <span className="text-xs text-stone-500 w-4">{i + 1}.</span>
                          <input
                            type="text"
                            value={(editForm.hints as string[])?.[i] || ''}
                            onChange={(e) => {
                              const newHints = [...((editForm.hints as string[]) || ['', '', ''])];
                              newHints[i] = e.target.value;
                              setEditForm({ ...editForm, hints: newHints });
                            }}
                            placeholder={`Indice ${i + 1}...`}
                            className="flex-1 px-3 py-1.5 bg-stone-900 border border-stone-600 rounded-lg text-amber-100 text-sm focus:border-amber-500 outline-none"
                          />
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={handleSaveRound}
                        disabled={actionLoading === 'save'}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-700 text-white text-sm hover:bg-green-600 transition-all disabled:opacity-50"
                      >
                        {actionLoading === 'save' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        Sauvegarder
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-700 text-stone-300 text-sm hover:bg-stone-600 transition-all"
                      >
                        <X className="w-4 h-4" />
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View Mode */
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-xs text-stone-500">
                          Manche {round.id}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            round.difficulty === 'Facile'
                              ? 'bg-green-900/50 text-green-400'
                              : round.difficulty === 'Moyen'
                              ? 'bg-amber-900/50 text-amber-400'
                              : round.difficulty === 'Difficile'
                              ? 'bg-orange-900/50 text-orange-400'
                              : 'bg-red-900/50 text-red-400'
                          }`}
                        >
                          {round.difficulty}
                        </span>
                      </div>
                      <h3 className="font-display text-amber-100 font-semibold">
                        {round.name}
                      </h3>
                      {round.question && (
                        <p className="text-xs text-stone-400 mt-1 line-clamp-2">
                          📝 {round.question}
                        </p>
                      )}
                      {showSolutions && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs text-stone-500">Solution:</span>
                          <span className="font-mono text-amber-400 tracking-wider">
                            {round.solution}
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleEditRound(round)}
                      disabled={gameState.isStarted}
                      className={`p-2 rounded-lg transition-all ${
                        gameState.isStarted
                          ? 'text-stone-600 cursor-not-allowed'
                          : 'text-stone-400 hover:text-amber-400 hover:bg-stone-700'
                      }`}
                    >
                      <Edit3 className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {gameState.isStarted && (
            <p className="text-xs text-amber-700 mt-4 text-center">
              ⚠️ Arrêtez la partie pour modifier les manches
            </p>
          )}
        </motion.div>
      </main>
    </div>
  );
}
