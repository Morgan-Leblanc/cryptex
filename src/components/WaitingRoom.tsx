import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Users, LogOut, Loader2, Flame, KeyRound, AlertCircle } from 'lucide-react';
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

interface PlayerInfo {
  username: string;
  avatar?: string;
}

export function WaitingRoom() {
  const { user, logout, setWaitingForStart, gameId, joinGameWithCode } = useGameStore();
  const [dots, setDots] = useState('');
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // État pour rejoindre une partie
  const [gameCode, setGameCode] = useState(['', '', '', '', '', '']);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Animate dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Focus first input on mount if no gameId
  useEffect(() => {
    if (!gameId) {
      codeInputRefs.current[0]?.focus();
    }
  }, [gameId]);

  // Handle game code input
  const handleCodeChange = (index: number, value: string) => {
    if (!/^[a-zA-Z0-9]*$/.test(value)) return;
    
    const newCode = [...gameCode];
    newCode[index] = value.slice(-1).toUpperCase();
    setGameCode(newCode);
    setJoinError(null);

    if (value && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !gameCode[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const handleJoinGame = async () => {
    const code = gameCode.join('');
    if (code.length < 4) {
      setJoinError('Code trop court (minimum 4 caractères)');
      return;
    }

    setIsJoining(true);
    setJoinError(null);

    try {
      // D'abord valider le code de partie
      const result = await joinGameWithCode(code);
      
      if (result.error) {
        setJoinError(result.message || 'Code invalide');
        setGameCode(['', '', '', '', '', '']);
        codeInputRefs.current[0]?.focus();
        setIsJoining(false);
        return;
      }
      
      // Code valide ! Maintenant appeler l'API pour vraiment rejoindre
      if (user) {
        const joinResponse = await fetch(`${API_BASE}?action=join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: user.username, avatar: user.avatar }),
        });
        
        if (!joinResponse.ok) {
          const errorData = await joinResponse.json();
          setJoinError(errorData.message || 'Impossible de rejoindre');
          setGameCode(['', '', '', '', '', '']);
          codeInputRefs.current[0]?.focus();
        }
        // Si ok, le store a déjà été mis à jour par joinGameWithCode
        // et le composant va se re-render pour afficher la salle d'attente normale
      }
    } catch {
      setJoinError('Erreur de connexion');
    } finally {
      setIsJoining(false);
    }
  };

  // Poll for game state
  const fetchGameState = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}?admin=true`);
      if (response.ok) {
        const data = await response.json();
        // Extract player info with avatars
        if (data.players) {
          setPlayers(data.players.map((p: { username: string; avatar?: string }) => ({
            username: p.username,
            avatar: p.avatar,
          })));
        } else if (data.connectedPlayers) {
          setPlayers(data.connectedPlayers.map((name: string) => ({ username: name })));
        }
        
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

  // Si pas de gameId, afficher l'écran pour rejoindre une partie
  if (!gameId) {
    return (
      <div className="min-h-screen min-h-[100dvh] flex flex-col items-center justify-center p-6 relative overflow-hidden bg-stone-texture">
        <div className="torch-glow absolute inset-0 pointer-events-none" />
        <AnimatedTorch side="left" />
        <AnimatedTorch side="right" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-md"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div 
              className="inline-block mb-6"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div 
                className="relative w-20 h-20 rounded-full flex items-center justify-center"
                style={{
                  background: 'conic-gradient(from 0deg, #8b4513, #d4af37, #ffd700, #d4af37, #8b4513)',
                  boxShadow: '0 0 30px rgba(212, 175, 55, 0.4)',
                }}
              >
                <div 
                  className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{ background: 'radial-gradient(circle at 30% 30%, #8b4513, #3d1f08)' }}
                >
                  <KeyRound className="w-7 h-7 text-amber-200" />
                </div>
              </div>
            </motion.div>
            
            <h1 
              className="font-display text-2xl sm:text-3xl font-bold tracking-wide mb-2"
              style={{
                background: 'linear-gradient(180deg, #f5ede0 0%, #d4af37 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Rejoindre une Partie
            </h1>
            <p className="text-amber-600 text-sm">
              Entrez le code fourni par le maître du jeu
            </p>
          </div>

          {/* User info */}
          <div className="flex items-center justify-center gap-3 mb-6">
            {user.avatar ? (
              <img 
                src={user.avatar} 
                alt={user.username}
                className="w-10 h-10 rounded-full object-cover border-2 border-amber-500"
              />
            ) : (
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-stone-900"
                style={{ background: 'linear-gradient(135deg, #d4af37 0%, #8b6914 100%)' }}
              >
                {user.username.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-amber-200 font-display">{user.username}</span>
          </div>

          {/* Code Input */}
          <div className="card-parchment p-6">
            <div className="flex gap-2 justify-center mb-4">
              {gameCode.map((char, index) => (
                <input
                  key={index}
                  ref={(el) => { codeInputRefs.current[index] = el; }}
                  type="text"
                  maxLength={1}
                  value={char}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(index, e)}
                  disabled={isJoining}
                  className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-display font-bold rounded-lg bg-stone-900 border-2 border-stone-700 text-amber-200 focus:border-amber-500 outline-none uppercase transition-all disabled:opacity-50"
                  style={{
                    boxShadow: char 
                      ? '0 0 20px rgba(212, 175, 55, 0.2)' 
                      : 'inset 0 2px 8px rgba(0,0,0,0.4)',
                  }}
                />
              ))}
            </div>

            {/* Error */}
            <AnimatePresence>
              {joinError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center gap-2 text-red-400 text-sm mb-4"
                >
                  <AlertCircle className="w-4 h-4" />
                  <span>{joinError}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Join Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleJoinGame}
              disabled={gameCode.filter(c => c).length < 4 || isJoining}
              className="w-full py-3 rounded-xl font-display font-bold uppercase tracking-wider bg-gradient-to-r from-amber-600 to-amber-700 text-stone-900 shadow-lg shadow-amber-900/30 hover:from-amber-500 hover:to-amber-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Connexion...
                </>
              ) : (
                'Rejoindre'
              )}
            </motion.button>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="mt-6 mx-auto flex items-center gap-2 text-stone-500 hover:text-red-400 transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" />
            Changer d'identité
          </button>
        </motion.div>
      </div>
    );
  }

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
            {user.avatar ? (
              <img 
                src={user.avatar} 
                alt={user.username}
                className="w-12 h-12 rounded-full object-cover border-2 border-amber-500"
                style={{ boxShadow: '0 4px 15px rgba(212, 175, 55, 0.3)' }}
              />
            ) : (
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
            )}
            <div className="text-left">
              <p className="text-amber-100 font-display font-semibold">{user.username}</p>
              <p className="text-xs text-amber-600">Explorateur</p>
            </div>
          </div>

          {/* Connected players */}
          <div className="flex items-center justify-center gap-2 text-amber-500 text-sm mb-4">
            <Users className="w-4 h-4" />
            <span className="font-display">{players.length} aventurier{players.length > 1 ? 's' : ''} dans le temple</span>
          </div>

          {players.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {players.map((player, index) => (
                <motion.div
                  key={player.username}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-body ${
                    player.username === user.username
                      ? 'bg-amber-900/50 text-amber-200 border border-amber-600'
                      : 'bg-stone-800/80 text-stone-400 border border-stone-700'
                  }`}
                >
                  {player.avatar ? (
                    <img 
                      src={player.avatar} 
                      alt={player.username}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-stone-700 flex items-center justify-center text-[10px] font-bold text-amber-400">
                      {player.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {player.username}
                  {player.username === user.username && ' ★'}
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
