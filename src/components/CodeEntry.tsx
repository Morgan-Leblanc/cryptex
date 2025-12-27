import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { useGameStore } from '../stores/gameStore';

// Symboles mystérieux décoratifs
const mysterySymbols = ['𓂀', '𓃭', '𓆣', '𓇳', '𓊽', '𓋹', '𓌙', '𓍯'];

function DustParticle({ delay }: { delay: number }) {
  const x = Math.random() * 100;
  const size = 2 + Math.random() * 3;
  
  return (
    <motion.div
      className="absolute rounded-full bg-amber-200/30"
      style={{ 
        width: size, 
        height: size, 
        left: `${x}%`,
        bottom: '10%',
      }}
      initial={{ opacity: 0, y: 0 }}
      animate={{ 
        opacity: [0, 0.6, 0.6, 0],
        y: -150,
        x: [0, 20, -10, 30],
      }}
      transition={{
        duration: 8,
        delay,
        repeat: Infinity,
        ease: 'linear',
      }}
    />
  );
}

export function CodeEntry() {
  const [code, setCode] = useState(['', '', '', '']);
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const validateCode = useGameStore((s) => s.validateCode);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    setError(false);

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newCode.every((c) => c !== '')) {
      const fullCode = newCode.join('');
      setTimeout(() => {
        const valid = validateCode(fullCode);
        if (!valid) {
          setError(true);
          setShake(true);
          setTimeout(() => {
            setShake(false);
            setCode(['', '', '', '']);
            inputRefs.current[0]?.focus();
          }, 600);
        }
      }, 200);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col items-center justify-center p-6 relative overflow-hidden bg-stone-texture">
      {/* Torch light effect */}
      <div className="torch-glow absolute inset-0 pointer-events-none" />
      
      {/* Dust particles */}
      {[...Array(12)].map((_, i) => (
        <DustParticle key={i} delay={i * 0.8} />
      ))}
      
      {/* Decorative corner symbols */}
      <div className="absolute top-8 left-8 text-3xl text-amber-600/20 font-runes">𓊽</div>
      <div className="absolute top-8 right-8 text-3xl text-amber-600/20 font-runes">𓋹</div>
      <div className="absolute bottom-8 left-8 text-3xl text-amber-600/20 font-runes">𓂀</div>
      <div className="absolute bottom-8 right-8 text-3xl text-amber-600/20 font-runes">𓆣</div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="relative z-10 flex flex-col items-center w-full max-w-md"
      >
        {/* Cryptex Lock Icon */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 150 }}
          className="mb-8 float-gentle"
        >
          <div className="relative">
            {/* Outer ring */}
            <div 
              className="w-28 h-28 sm:w-32 sm:h-32 rounded-full flex items-center justify-center"
              style={{
                background: 'conic-gradient(from 0deg, #8b4513, #cd7f32, #d4af37, #cd7f32, #8b4513)',
                boxShadow: '0 0 40px rgba(212, 175, 55, 0.3), 0 15px 40px rgba(0,0,0,0.6), inset 0 0 30px rgba(0,0,0,0.4)',
              }}
            >
              {/* Inner circle */}
              <div 
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center"
                style={{
                  background: 'radial-gradient(circle at 30% 30%, #3d2e1f, #1a1510)',
                  boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.8)',
                }}
              >
                {/* Keyhole */}
                <div className="relative">
                  <div 
                    className="w-6 h-6 rounded-full bg-stone-950"
                    style={{ boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.9)' }}
                  />
                  <div 
                    className="absolute top-5 left-1/2 -translate-x-1/2 w-2.5 h-6 bg-stone-950"
                    style={{ boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.9)' }}
                  />
                </div>
              </div>
            </div>
            
            {/* Rotating symbols around the lock */}
            <motion.div 
              className="absolute inset-0"
              animate={{ rotate: 360 }}
              transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
            >
              {mysterySymbols.map((symbol, i) => (
                <span
                  key={i}
                  className="absolute text-lg text-amber-600/40"
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: `rotate(${i * 45}deg) translateY(-70px) rotate(-${i * 45}deg) translate(-50%, -50%)`,
                  }}
                >
                  {symbol}
                </span>
              ))}
            </motion.div>
          </div>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mb-2"
        >
          <h1 
            className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-[0.15em]"
            style={{
              background: 'linear-gradient(180deg, #f5ede0 0%, #d4af37 50%, #8b6914 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 0 60px rgba(212, 175, 55, 0.4)',
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))',
            }}
          >
            CRYPTEX
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.5 }}
          className="w-32 h-px mb-4"
          style={{
            background: 'linear-gradient(90deg, transparent, #d4af37, transparent)',
          }}
        />

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-amber-200/60 text-center mb-10 text-base sm:text-lg font-body italic"
        >
          Le secret doit être mérité
        </motion.p>

        {/* Code Input */}
        <motion.div
          animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
          transition={{ duration: 0.5 }}
          className="flex gap-3 sm:gap-4 mb-6"
        >
          {code.map((digit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20, rotateX: 90 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ delay: 0.7 + index * 0.1, type: 'spring' }}
              className="relative"
            >
              {/* Decorative frame */}
              <div 
                className="absolute -inset-1 rounded-xl opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #8b4513 0%, #d4af37 50%, #8b4513 100%)',
                }}
              />
              <input
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className={`
                  relative w-14 h-18 sm:w-16 sm:h-20 text-center text-3xl sm:text-4xl font-display font-bold
                  rounded-lg transition-all duration-300 outline-none
                  ${error
                    ? 'bg-red-950 border-2 border-red-500 text-red-400'
                    : digit
                      ? 'bg-stone-900 border-2 border-amber-500 text-amber-200'
                      : 'bg-stone-900/90 border-2 border-stone-700 text-stone-400'
                  }
                  focus:border-amber-400
                `}
                style={{
                  boxShadow: digit 
                    ? '0 0 30px rgba(212, 175, 55, 0.3), inset 0 0 20px rgba(212, 175, 55, 0.1)' 
                    : 'inset 0 4px 12px rgba(0,0,0,0.5)',
                }}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 text-red-400 mb-4 text-sm bg-red-950/50 px-4 py-2 rounded-lg border border-red-800"
            >
              <AlertCircle className="w-4 h-4" />
              <span className="font-body">Le mécanisme se bloque...</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="text-amber-800/80 text-sm text-center font-body italic mt-4"
        >
          « L'année du renouveau... »
        </motion.p>
      </motion.div>
      
      {/* Bottom decorative line */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-16 left-1/2 -translate-x-1/2 w-64 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, #8b4513, #d4af37, #8b4513, transparent)',
        }}
      />
    </div>
  );
}
