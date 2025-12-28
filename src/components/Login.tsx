import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2, Compass, Map, ScrollText, AlertTriangle, Camera, User, Lock, Shield } from 'lucide-react';
import { useGameStore } from '../stores/gameStore';
import { GiphyPicker } from './GiphyPicker';

const ADMIN_USERNAME = 'admin2026';

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGiphyPicker, setShowGiphyPicker] = useState(false);
  
  const login = useGameStore((s) => s.login);
  const adminLogin = useGameStore((s) => s.adminLogin);

  // Détecter si l'utilisateur entre le nom admin
  const isAdminLogin = username.toLowerCase() === ADMIN_USERNAME.toLowerCase();

  // Reset password quand on change de username
  useEffect(() => {
    if (!isAdminLogin) {
      setPassword('');
    }
  }, [isAdminLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim().length >= 2 && !isLoading) {
      // Si c'est l'admin, vérifier qu'il y a un mot de passe
      if (isAdminLogin && !password) {
        setError('Mot de passe requis pour l\'administrateur');
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        let result;
        
        if (isAdminLogin) {
          // Authentification admin avec JWT
          result = await adminLogin(password);
        } else {
          // Login normal pour les joueurs
          result = await login(username.trim(), avatar);
        }
        
        if (result && 'error' in result) {
          setError(result.message || 'Impossible de rejoindre la partie');
        }
      } catch {
        setError('Erreur de connexion au serveur');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const isValid = username.trim().length >= 2 && (!isAdminLogin || password.length >= 4);

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col items-center justify-center p-6 relative overflow-hidden bg-stone-texture">
      {/* Torch glow effect */}
      <div className="torch-glow absolute inset-0 pointer-events-none" />
      
      {/* Decorative map lines */}
      <svg className="absolute inset-0 w-full h-full opacity-5" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="map-lines" width="100" height="100" patternUnits="userSpaceOnUse">
            <path d="M0 50 Q 25 30 50 50 T 100 50" fill="none" stroke="#d4af37" strokeWidth="0.5"/>
            <path d="M50 0 Q 30 25 50 50 T 50 100" fill="none" stroke="#d4af37" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#map-lines)" />
      </svg>

      {/* Corner decorations */}
      <div className="absolute top-6 left-6 text-amber-700/30">
        <Compass className="w-8 h-8" />
      </div>
      <div className="absolute top-6 right-6 text-amber-700/30">
        <Map className="w-8 h-8" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Header */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-8"
        >
          {/* Scroll/Journal Icon */}
          <motion.div 
            className="inline-block mb-6"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div 
              className="relative w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #5c2e0d 0%, #3d1f08 100%)',
                boxShadow: '0 10px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(212, 175, 55, 0.2)',
                border: '2px solid #8b4513',
              }}
            >
              <ScrollText className="w-10 h-10 text-amber-400" />
              
              {/* Gold corners */}
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-amber-500 rounded-tl" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-amber-500 rounded-tr" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-amber-500 rounded-bl" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-amber-500 rounded-br" />
            </div>
          </motion.div>
          
          <h1 
            className="font-display text-3xl sm:text-4xl font-bold mb-3 tracking-wide"
            style={{
              background: 'linear-gradient(180deg, #f5ede0 0%, #d4af37 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Journal de l'Explorateur
          </h1>
          
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.4 }}
            className="w-24 h-px mx-auto mb-4"
            style={{ background: 'linear-gradient(90deg, transparent, #d4af37, transparent)' }}
          />
          
          <p className="text-amber-200/70 text-base sm:text-lg font-body italic">
            Inscrivez votre nom dans les annales
          </p>
        </motion.div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card-parchment p-6 sm:p-8"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar Picker */}
            <div className="flex flex-col items-center">
              <label className="block text-amber-400/80 text-sm font-display uppercase tracking-wider mb-3 text-center">
                Votre Avatar
              </label>
              <motion.button
                type="button"
                onClick={() => setShowGiphyPicker(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative w-20 h-20 rounded-full overflow-hidden border-3 border-amber-600 hover:border-amber-400 transition-all group"
                style={{
                  background: avatar ? 'transparent' : 'linear-gradient(135deg, #3d1f08 0%, #1a0f04 100%)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.5), inset 0 0 20px rgba(212, 175, 55, 0.1)',
                }}
              >
                {avatar ? (
                  <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-8 h-8 text-amber-700" />
                  </div>
                )}
                
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-6 h-6 text-amber-400" />
                </div>
              </motion.button>
              <p className="text-xs text-amber-600/70 mt-2">
                Cliquez pour choisir un GIF
              </p>
            </div>

            <div className="relative">
              <label className="block text-amber-400/80 text-sm font-display uppercase tracking-wider mb-2">
                Nom de l'Aventurier
              </label>
              <motion.div
                animate={{
                  boxShadow: isFocused
                    ? '0 0 30px rgba(212, 175, 55, 0.2)'
                    : '0 0 0px rgba(212, 175, 55, 0)',
                }}
                className="rounded-lg overflow-hidden"
              >
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder="Dr. Jones, Lara, Nathan..."
                  disabled={isLoading}
                  className="input-ancient w-full text-lg"
                  autoFocus
                  autoComplete="off"
                  autoCapitalize="off"
                />
              </motion.div>
              
              {username && !isAdminLogin && username.length < 2 && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute -bottom-5 left-0 text-xs text-amber-600"
                >
                  Au moins 2 caractères requis
                </motion.p>
              )}
            </div>

            {/* Admin password field */}
            {isAdminLogin && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative"
              >
                <label className="block text-sm font-medium text-amber-200/70 mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <span>Mot de passe administrateur</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500/50" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={isLoading}
                    className="input-ancient w-full text-lg pl-12"
                    autoComplete="current-password"
                  />
                </div>
                <p className="text-xs text-amber-500/50 mt-2">
                  Accès réservé à l'administrateur de la partie
                </p>
              </motion.div>
            )}

            {/* Error message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-lg bg-red-900/50 border border-red-700/50 flex items-start gap-3"
              >
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-300 text-sm font-medium">Accès refusé</p>
                  <p className="text-red-400/80 text-xs mt-1">{error}</p>
                </div>
              </motion.div>
            )}

            <motion.button
              type="submit"
              disabled={!isValid || isLoading}
              whileHover={isValid && !isLoading ? { scale: 1.02, y: -2 } : {}}
              whileTap={isValid && !isLoading ? { scale: 0.98 } : {}}
              className={`
                w-full py-4 px-6 rounded-lg font-display text-base sm:text-lg font-bold
                flex items-center justify-center gap-3
                transition-all duration-300 uppercase tracking-wider
                ${isValid && !isLoading
                  ? 'btn-adventure'
                  : 'bg-stone-800 text-stone-500 cursor-not-allowed border-2 border-stone-700'
                }
              `}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Inscription...</span>
                </>
              ) : (
                <>
                  <span>Partir à l'Aventure</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </motion.button>
          </form>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center mt-8 space-y-2"
        >
          <div className="flex items-center justify-center gap-4 text-amber-800/60">
            <span className="text-lg">𓂀</span>
            <p className="text-sm font-body">
              6 énigmes ancestrales vous attendent
            </p>
            <span className="text-lg">𓂀</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Giphy Picker Modal */}
      <GiphyPicker
        isOpen={showGiphyPicker}
        onClose={() => setShowGiphyPicker(false)}
        onSelect={setAvatar}
        currentAvatar={avatar}
      />
    </div>
  );
}
