import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Clock, LogOut, Users, Loader2 } from 'lucide-react';
import { useGameStore } from '../stores/gameStore';

const API_BASE = '/api/game';

interface PlayerInfo {
  username: string;
  avatar?: string;
}

// Titres mystiques pour les joueurs
const MYSTIC_TITLES = [
  'Gardien des runes',
  'Chercheur de vérité',
  'Maître des énigmes',
  'Éclaireur antique',
  'Sage des cryptes',
  'Explorateur intrépide',
  'Déchiffreur de mystères',
  'Chasseur de trésors',
];

export function WaitingRoom() {
  const { user, logout, setWaitingForStart } = useGameStore();
  const [dots, setDots] = useState('');
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Animation des points
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return '';
        return prev + '.';
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Poll simple pour l'état du jeu
  const fetchGameState = useCallback(async () => {
    try {
      const response = await fetch(API_BASE);
      if (response.ok) {
        const data = await response.json();
        
        // Si la partie est lancée, mettre à jour le store
        if (data.isStarted) {
          setWaitingForStart(false);
          return;
        }
        
        // Récupérer les joueurs depuis l'endpoint admin
        try {
          const adminResponse = await fetch(`${API_BASE}?admin=true`);
          if (adminResponse.ok) {
            const adminData = await adminResponse.json();
            if (adminData.players && Array.isArray(adminData.players)) {
              setPlayers(adminData.players.map((p: { username: string; avatar?: string }) => ({
                username: p.username,
                avatar: p.avatar,
              })));
            } else if (adminData.connectedPlayers && Array.isArray(adminData.connectedPlayers)) {
              setPlayers(adminData.connectedPlayers.map((name: string) => ({ username: name })));
            }
          }
        } catch {
          // Ignorer les erreurs
        }
      }
    } catch (error) {
      console.error('Failed to fetch game state:', error);
    }
  }, [setWaitingForStart]);

  // Fetch initial SEULEMENT
  useEffect(() => {
    fetchGameState();
  }, [fetchGameState]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
  };

  const getPlayerTitle = (index: number) => {
    return MYSTIC_TITLES[index % MYSTIC_TITLES.length];
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-stone-texture">
      {/* Torch glow effect */}
      <div className="torch-glow absolute inset-0 pointer-events-none" />
      
      {/* Animated mystical rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{ 
              width: 200 + i * 120, 
              height: 200 + i * 120,
              border: `1px solid rgba(212, 175, 55, ${0.15 - i * 0.03})`,
            }}
            animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
            transition={{ duration: 30 + i * 15, repeat: Infinity, ease: 'linear' }}
          />
        ))}
      </div>

      {/* Floating ancient symbols */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {['𓊽', '𓋹', '𓆣', '𓂀', '☥', '𓃠'].map((symbol, i) => (
          <motion.div
            key={i}
            className="absolute text-amber-700/10 text-4xl"
            style={{
              left: `${15 + (i * 15)}%`,
              top: `${20 + (i * 10)}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.1, 0.2, 0.1],
            }}
            transition={{
              duration: 4 + i,
              repeat: Infinity,
              delay: i * 0.5,
            }}
          >
            {symbol}
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-lg"
      >
        {/* Main card */}
        <div 
          className="rounded-2xl p-6 sm:p-8"
          style={{
            background: 'linear-gradient(180deg, rgba(30, 27, 22, 0.95) 0%, rgba(20, 18, 15, 0.98) 100%)',
            border: '1px solid rgba(139, 105, 20, 0.3)',
            boxShadow: '0 0 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(212, 175, 55, 0.1)',
          }}
        >
          {/* Header with animated icon */}
          <div className="text-center mb-8">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="relative w-20 h-20 mx-auto mb-4"
            >
              <div 
                className="w-full h-full rounded-full flex items-center justify-center"
                style={{
                  background: 'conic-gradient(from 0deg, #3d1f08, #8b4513, #d4af37, #8b4513, #3d1f08)',
                  boxShadow: '0 0 40px rgba(212, 175, 55, 0.3)',
                }}
              >
                <div 
                  className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{ background: 'radial-gradient(circle at 30% 30%, #2a2418, #0f0d0a)' }}
                >
                  <Clock className="w-7 h-7 text-amber-500" />
                </div>
              </div>
              
              {/* Orbiting dots */}
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full bg-amber-500/50"
                  style={{ top: '50%', left: '50%' }}
                  animate={{ 
                    rotate: 360,
                  }}
                  transition={{ 
                    duration: 3, 
                    repeat: Infinity, 
                    ease: 'linear',
                    delay: i * 1,
                  }}
                >
                  <div 
                    className="w-2 h-2 rounded-full bg-amber-400"
                    style={{ transform: 'translateX(35px)' }}
                  />
                </motion.div>
              ))}
            </motion.div>
            
            <h1 
              className="font-display text-2xl sm:text-3xl font-bold mb-2 tracking-wide"
              style={{
                background: 'linear-gradient(180deg, #f5ede0 0%, #d4af37 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Chambre d'Attente
            </h1>
            <p className="text-amber-600/80 font-body">
              Le gardien prépare les épreuves{dots}
            </p>
          </div>

          {/* Connected players */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-amber-500" />
              <h2 className="font-display text-lg text-amber-200">
                Explorateurs présents ({players.length})
              </h2>
            </div>
            
            <div 
              className="space-y-2 max-h-60 overflow-y-auto rounded-lg p-3"
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(139, 105, 20, 0.2)',
              }}
            >
              {players.length === 0 ? (
                <div className="text-center py-6">
                  <Loader2 className="w-6 h-6 text-amber-600 animate-spin mx-auto mb-2" />
                  <p className="text-amber-700 text-sm font-body">Chargement des explorateurs...</p>
                </div>
              ) : (
                players.map((player, index) => (
                  <motion.div
                    key={player.username}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3 p-3 rounded-lg transition-all hover:bg-amber-900/20"
                    style={{
                      background: player.username === user.username 
                        ? 'rgba(212, 175, 55, 0.1)' 
                        : 'transparent',
                      border: player.username === user.username 
                        ? '1px solid rgba(212, 175, 55, 0.3)' 
                        : '1px solid transparent',
                    }}
                  >
                    {player.avatar ? (
                      <img
                        src={player.avatar}
                        alt={player.username}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-amber-700/50"
                      />
                    ) : (
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-stone-900"
                        style={{
                          background: 'linear-gradient(135deg, #d4af37 0%, #8b6914 100%)',
                        }}
                      >
                        {player.username[0].toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-amber-100 font-display font-medium truncate">
                        {player.username}
                        {player.username === user.username && (
                          <span className="text-amber-500 text-xs ml-2">(vous)</span>
                        )}
                      </p>
                      <p className="text-amber-700/70 text-xs font-body truncate">
                        {getPlayerTitle(index)}
                      </p>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={async () => {
                setIsRefreshing(true);
                await fetchGameState();
                setIsRefreshing(false);
              }}
              disabled={isRefreshing}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-display text-sm uppercase tracking-wider transition-all disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #8b6914 0%, #6b4f0f 100%)',
                boxShadow: '0 4px 15px rgba(139, 105, 20, 0.3)',
              }}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="text-amber-100">{isRefreshing ? 'Actualisation...' : 'Rafraîchir'}</span>
            </button>
            
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-display text-sm uppercase tracking-wider transition-all disabled:opacity-50 border border-red-800/50 hover:bg-red-900/30 hover:border-red-600/50"
              style={{
                background: 'rgba(127, 29, 29, 0.2)',
              }}
            >
              <LogOut className="w-4 h-4 text-red-400" />
              <span className="text-red-400">{isLoggingOut ? 'Déconnexion...' : 'Quitter'}</span>
            </button>
          </div>
        </div>

        {/* Bottom hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-amber-700/50 text-xs mt-4 font-body"
        >
          La partie commencera dès que le gardien lancera les épreuves
        </motion.p>
      </motion.div>
    </div>
  );
}
