import { motion } from 'framer-motion';
import { Trophy, RotateCcw, Crown, Gem, Scroll, Shield } from 'lucide-react';
import { useGameStore } from '../stores/gameStore';

// Particules de trésor
function TreasureParticle({ delay, type }: { delay: number; type: 'gold' | 'gem' | 'sparkle' }) {
  const x = 20 + Math.random() * 60;
  const colors = {
    gold: ['#d4af37', '#ffd700', '#b8860b'],
    gem: ['#e11d48', '#22c55e', '#3b82f6', '#a855f7'],
    sparkle: ['#ffffff', '#fef08a'],
  };
  const color = colors[type][Math.floor(Math.random() * colors[type].length)];
  const size = type === 'sparkle' ? 2 + Math.random() * 2 : 4 + Math.random() * 4;
  
  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        width: size,
        height: size,
        background: type === 'sparkle' 
          ? color 
          : `radial-gradient(circle at 30% 30%, ${color}, ${color}88)`,
        left: `${x}%`,
        bottom: '30%',
        boxShadow: type !== 'sparkle' ? `0 0 ${size}px ${color}66` : 'none',
      }}
      initial={{ opacity: 0, y: 0, scale: 0 }}
      animate={{
        opacity: [0, 1, 1, 0],
        y: [-20, -150 - Math.random() * 100],
        x: [(Math.random() - 0.5) * 100, (Math.random() - 0.5) * 150],
        scale: [0, 1, 1, 0],
        rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
      }}
      transition={{
        duration: 2.5 + Math.random(),
        delay,
        repeat: Infinity,
        repeatDelay: 4,
        ease: 'easeOut',
      }}
    />
  );
}

// Symboles mystérieux flottants
function FloatingSymbol({ symbol, delay, x }: { symbol: string; delay: number; x: number }) {
  return (
    <motion.div
      className="absolute text-3xl text-amber-500/20"
      style={{ left: `${x}%`, top: '20%' }}
      animate={{
        y: [0, -20, 0],
        rotate: [0, 5, -5, 0],
        opacity: [0.1, 0.3, 0.1],
      }}
      transition={{
        duration: 4 + Math.random() * 2,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      {symbol}
    </motion.div>
  );
}

export function Victory() {
  const { session, user, resetGame, logout } = useGameStore();

  if (!session || !user) return null;

  const totalTime = session.roundScores.reduce((a, b) => a + b, 0);
  
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getRank = () => {
    const avgTime = totalTime / 6;
    if (avgTime <= 30) return { title: 'Légende Vivante', icon: Crown, gradient: 'from-amber-300 via-yellow-200 to-amber-300' };
    if (avgTime <= 60) return { title: 'Maître des Arcanes', icon: Gem, gradient: 'from-purple-400 via-pink-300 to-purple-400' };
    if (avgTime <= 120) return { title: 'Gardien du Temple', icon: Shield, gradient: 'from-emerald-400 via-green-300 to-emerald-400' };
    return { title: 'Explorateur Intrépide', icon: Scroll, gradient: 'from-amber-500 via-orange-400 to-amber-500' };
  };

  const rank = getRank();
  const RankIcon = rank.icon;

  const mysterySymbols = ['𓂀', '𓃭', '𓆣', '𓇳', '𓊽', '𓋹'];

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-stone-texture">
      {/* Torch glow */}
      <div className="torch-glow absolute inset-0 pointer-events-none" />

      {/* Radial glow */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at 50% 40%, rgba(74, 222, 128, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 30% 60%, rgba(212, 175, 55, 0.1) 0%, transparent 40%),
            radial-gradient(ellipse at 70% 60%, rgba(212, 175, 55, 0.1) 0%, transparent 40%)
          `,
        }}
      />

      {/* Floating mystery symbols */}
      {mysterySymbols.map((symbol, i) => (
        <FloatingSymbol key={i} symbol={symbol} delay={i * 0.5} x={10 + i * 15} />
      ))}

      {/* Treasure particles */}
      {[...Array(15)].map((_, i) => (
        <TreasureParticle 
          key={`gold-${i}`} 
          delay={i * 0.15} 
          type="gold" 
        />
      ))}
      {[...Array(8)].map((_, i) => (
        <TreasureParticle 
          key={`gem-${i}`} 
          delay={i * 0.2 + 0.5} 
          type="gem" 
        />
      ))}
      {[...Array(20)].map((_, i) => (
        <TreasureParticle 
          key={`sparkle-${i}`} 
          delay={i * 0.1} 
          type="sparkle" 
        />
      ))}

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 text-center w-full max-w-md"
      >
        {/* Grand trophée animé */}
        <motion.div
          initial={{ scale: 0, rotate: -180, y: -50 }}
          animate={{ scale: 1, rotate: 0, y: 0 }}
          transition={{ type: 'spring', stiffness: 150, damping: 15, delay: 0.2 }}
          className="relative inline-block mb-6"
        >
          {/* Halo lumineux */}
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 -m-8 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(74, 222, 128, 0.4) 0%, transparent 70%)',
            }}
          />
          
          {/* Cercle principal */}
          <div 
            className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full flex items-center justify-center"
            style={{
              background: 'conic-gradient(from 0deg, #166534, #22c55e, #4ade80, #86efac, #4ade80, #22c55e, #166534)',
              boxShadow: '0 0 60px rgba(74, 222, 128, 0.5), inset 0 0 30px rgba(0,0,0,0.3)',
            }}
          >
            <div 
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center"
              style={{
                background: 'radial-gradient(circle at 30% 30%, #22c55e, #166534, #052e16)',
                boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.5)',
              }}
            >
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Trophy className="w-10 h-10 sm:w-12 sm:h-12 text-green-200 drop-shadow-lg" />
              </motion.div>
            </div>
          </div>

          {/* Étoiles autour */}
          {[0, 72, 144, 216, 288].map((angle, i) => (
            <motion.div
              key={i}
              className="absolute w-3 h-3"
              style={{
                left: '50%',
                top: '50%',
                transform: `rotate(${angle}deg) translateY(-75px) rotate(-${angle}deg)`,
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1, 0.8, 1], opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.1 }}
            >
              <div 
                className="w-full h-full"
                style={{
                  background: '#ffd700',
                  clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
                  filter: 'drop-shadow(0 0 4px #ffd700)',
                }}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Titre */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="font-display text-4xl sm:text-5xl md:text-6xl font-bold mb-2 tracking-wider"
          style={{
            background: 'linear-gradient(180deg, #4ade80 0%, #22c55e 50%, #16a34a 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 0 40px rgba(74, 222, 128, 0.5)',
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))',
          }}
        >
          VICTOIRE !
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-lg sm:text-xl text-amber-100 mb-1"
        >
          Le cryptex a révélé ses secrets à
        </motion.p>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="text-2xl sm:text-3xl font-display font-bold mb-6"
          style={{
            background: 'linear-gradient(180deg, #f5ede0 0%, #d4af37 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {user.username}
        </motion.p>

        {/* Badge de rang */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, type: 'spring' }}
          className="inline-block mb-6"
        >
          <div 
            className="relative px-6 py-3 rounded-xl"
            style={{
              background: 'linear-gradient(135deg, #2a2418 0%, #1a1612 100%)',
              border: '2px solid #8b4513',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(212, 175, 55, 0.2)',
            }}
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${rank.gradient.split(' ')[0].replace('from-', '')} 0%, ${rank.gradient.split(' ')[2]?.replace('to-', '') || 'white'} 100%)`,
                }}
              >
                <RankIcon className="w-5 h-5 text-stone-900" />
              </div>
              <div className="text-left">
                <p className="text-amber-600 text-xs uppercase tracking-wider">Titre obtenu</p>
                <p 
                  className="font-display text-lg font-bold bg-clip-text text-transparent"
                  style={{
                    backgroundImage: `linear-gradient(90deg, var(--tw-gradient-stops))`,
                    ['--tw-gradient-from' as string]: rank.gradient.split(' ')[0].replace('from-', '').replace('-', ' '),
                  }}
                >
                  <span className={`bg-gradient-to-r ${rank.gradient} bg-clip-text text-transparent`}>
                    {rank.title}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="card-parchment p-5 mb-6"
        >
          <p className="text-amber-600 text-sm uppercase tracking-wider mb-4 font-display">
            Résumé de l'Expédition
          </p>
          
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center">
              <div className="text-3xl mb-1">🏆</div>
              <div className="font-display text-xl font-bold text-green-400">6/6</div>
              <div className="text-xs text-amber-700">Énigmes</div>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-1">⏱️</div>
              <div className="font-display text-xl font-bold text-amber-200">{formatTime(totalTime)}</div>
              <div className="text-xs text-amber-700">Temps total</div>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-1">⚡</div>
              <div className="font-display text-xl font-bold text-amber-200">{formatTime(Math.round(totalTime / 6))}</div>
              <div className="text-xs text-amber-700">Moyenne</div>
            </div>
          </div>

          {/* Temps par manche */}
          <div className="flex justify-center gap-1.5">
            {session.roundScores.map((time, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, rotateY: 180 }}
                animate={{ scale: 1, rotateY: 0 }}
                transition={{ delay: 1 + i * 0.1, type: 'spring' }}
                className="w-10 h-12 rounded-lg flex flex-col items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #166534 0%, #052e16 100%)',
                  border: '1px solid #22c55e',
                }}
              >
                <span className="text-[10px] text-green-600">{i + 1}</span>
                <span className="text-xs font-bold text-green-300">{time}s</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={resetGame}
            className="btn-adventure flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Nouvelle Aventure</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={logout}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-display text-sm uppercase tracking-wider bg-stone-900/80 border border-stone-700 text-stone-400 hover:text-amber-400 hover:border-amber-800 transition-all"
          >
            <span>Quitter le Temple</span>
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Bordure décorative en bas */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 w-64 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, #22c55e, #d4af37, #22c55e, transparent)',
        }}
      />
    </div>
  );
}
