import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Clock, Users, LogOut, Loader2, Flame } from 'lucide-react';
import { useGameStore } from '../stores/gameStore';

const API_BASE = '/api/game';
const POLL_INTERVAL = 2000;

// Torche animée
function AnimatedTorch({ side }: { side: 'left' | 'right' }) {
  return (
    <motion.div 
      className={`absolute top-20 ${side === 'left' ? 'left-4' : 'right-4'}`}
      animate={{ 
        filter: ['brightness(1)', 'brightness(1.3)', 'brightness(0.9)', 'brightness(1.1)', 'brightness(1)']
      }}
      transition={{ duration: 0.5, repeat: Infinity }}
    >
      <div className="relative">
        <motion.div
          animate={{ 
            scale: [1, 1.2, 0.9, 1.1, 1],
            opacity: [0.8, 1, 0.7, 0.9, 0.8],
          }}
          transition={{ duration: 0.3, repeat: Infinity }}
          className="absolute -top-6 left-1/2 -translate-x-1/2"
        >
          <Flame className="w-8 h-8 text-orange-400 drop-shadow-[0_0_10px_rgba(251,146,60,0.8)]" />
        </motion.div>
        <div 
          className="w-3 h-12 rounded-b-lg"
          style={{ 
            background: 'linear-gradient(180deg, #8b4513 0%, #5c2e0d 100%)',
            boxShadow: 'inset 2px 0 4px rgba(255,255,255,0.1)',
          }}
        />
      </div>
    </motion.div>
  );
}

export function WaitingRoom() {
  const { user, logout, setWaitingForStart } = useGameStore();
  const [dots, setDots] = useState('');
  const [connectedPlayers, setConnectedPlayers] = useState<string[]>([]);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Animate dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Poll for game state
  const fetchGameState = useCallback(async () => {
    try {
      const response = await fetch(API_BASE);
      if (response.ok) {
        const data = await response.json();
        setConnectedPlayers(data.connectedPlayers || []);
        
        if (data.isStarted) {
          setWaitingForStart(false);
        }
      }
    } catch (error) {
      console.error('Failed to fetch game state:', error);
    }
  }, [setWaitingForStart]);

  useEffect(() => {
    fetchGameState();
    const interval = setInterval(fetchGameState, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchGameState]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col items-center justify-center p-6 relative overflow-hidden bg-stone-texture">
      {/* Torch effects */}
      <div className="torch-glow absolute inset-0 pointer-events-none" />
      <AnimatedTorch side="left" />
      <AnimatedTorch side="right" />

      {/* Animated mystical rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 200 + i * 120,
              height: 200 + i * 120,
              border: '1px solid',
              borderColor: `rgba(212, 175, 55, ${0.1 - i * 0.02})`,
            }}
            animate={{ 
              rotate: i % 2 === 0 ? 360 : -360,
              scale: [1, 1.05, 1],
            }}
            transition={{
              rotate: { duration: 30 + i * 10, repeat: Infinity, ease: 'linear' },
              scale: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
            }}
          />
        ))}
      </div>

      {/* Stone symbols */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 flex gap-4 text-2xl text-amber-700/20">
        <span>𓊽</span>
        <span>𓆣</span>
        <span>𓋹</span>
        <span>𓂀</span>
        <span>𓌙</span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 text-center max-w-md w-full"
      >
        {/* Cryptex loading animation */}
        <motion.div
          className="relative inline-block mb-8"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            className="w-24 h-24 rounded-full flex items-center justify-center"
            style={{
              background: 'conic-gradient(from 0deg, #3d1f08, #8b4513, #cd7f32, #8b4513, #3d1f08)',
              boxShadow: '0 0 40px rgba(212, 175, 55, 0.2), inset 0 0 20px rgba(0,0,0,0.5)',
            }}
          >
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{
                background: 'radial-gradient(circle at 30% 30%, #2a2418, #0f0d0a)',
                boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.8)',
              }}
            >
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            </div>
          </motion.div>
        </motion.div>

        <h1 
          className="font-display text-2xl sm:text-3xl font-bold mb-2 tracking-wide"
          style={{
            background: 'linear-gradient(180deg, #f5ede0 0%, #d4af37 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          La quête commence bientôt{dots}
        </h1>

        <p className="text-amber-600/80 mb-8 font-body italic">
          Le maître du jeu prépare les énigmes ancestrales
        </p>

        {/* Player card */}
        <motion.div 
          className="card-parchment p-5 mb-6"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          {/* Current user */}
          <div className="flex items-center justify-center gap-3 mb-4 pb-4 border-b border-amber-900/30">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-display font-bold"
              style={{
                background: 'linear-gradient(135deg, #d4af37 0%, #8b6914 100%)',
                boxShadow: '0 4px 15px rgba(212, 175, 55, 0.3)',
                color: '#1a1612',
              }}
            >
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="text-left">
              <p className="text-amber-100 font-display font-semibold">{user.username}</p>
              <p className="text-xs text-amber-600">Explorateur</p>
            </div>
          </div>

          {/* Connected players */}
          <div className="flex items-center justify-center gap-2 text-amber-500 text-sm mb-4">
            <Users className="w-4 h-4" />
            <span className="font-display">{connectedPlayers.length} aventurier{connectedPlayers.length > 1 ? 's' : ''} dans le temple</span>
          </div>

          {connectedPlayers.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {connectedPlayers.map((player, index) => (
                <motion.div
                  key={player}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-body ${
                    player === user.username
                      ? 'bg-amber-900/50 text-amber-200 border border-amber-600'
                      : 'bg-stone-800/80 text-stone-400 border border-stone-700'
                  }`}
                >
                  {player}
                  {player === user.username && ' ★'}
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Game info */}
        <div className="flex items-center justify-center gap-6 text-sm text-amber-700/60 mb-8">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>6 épreuves</span>
          </div>
          <span className="text-amber-900/40">•</span>
          <div className="flex items-center gap-2">
            <span>6 lettres</span>
            <span className="text-lg">𓂀</span>
          </div>
        </div>

        {/* Logout button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex items-center justify-center gap-2 mx-auto px-6 py-3 rounded-lg bg-stone-900/80 border border-stone-700 text-stone-400 hover:text-red-400 hover:border-red-800 transition-all disabled:opacity-50"
        >
          {isLoggingOut ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <LogOut className="w-4 h-4" />
          )}
          <span className="font-display text-sm uppercase tracking-wider">Abandonner</span>
        </motion.button>
      </motion.div>
    </div>
  );
}
