import { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const LETTER_HEIGHT = 20; // Hauteur virtuelle par lettre pour le calcul

interface CryptexWheelProps {
  currentLetter: string;
  onChange: (letter: string) => void;
  isLocked: boolean;
  isCorrect?: boolean;
  index: number;
}

export function CryptexWheel({
  currentLetter,
  onChange,
  isLocked,
  isCorrect,
  index,
}: CryptexWheelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const velocityRef = useRef(0);
  const lastYRef = useRef(0);
  const lastTimeRef = useRef(0);
  const animationRef = useRef<number>();
  const accumulatorRef = useRef(0);
  
  const [isDragging, setIsDragging] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(
    LETTERS.indexOf(currentLetter) || 0
  );
  const [visualOffset, setVisualOffset] = useState(0);

  useEffect(() => {
    const idx = LETTERS.indexOf(currentLetter);
    if (idx !== -1 && idx !== currentIndex) {
      setCurrentIndex(idx);
    }
  }, [currentLetter, currentIndex]);

  // Changer de lettre avec animation fluide
  const changeLetter = useCallback((direction: number) => {
    if (isLocked) return;
    const newIndex = (currentIndex + direction + LETTERS.length) % LETTERS.length;
    setCurrentIndex(newIndex);
    onChange(LETTERS[newIndex]);
  }, [currentIndex, isLocked, onChange]);

  // Animation d'inertie
  const animateInertia = useCallback(() => {
    const friction = 0.92;
    const minVelocity = 0.5;
    
    velocityRef.current *= friction;
    
    if (Math.abs(velocityRef.current) > minVelocity) {
      accumulatorRef.current += velocityRef.current;
      
      // Calculer combien de lettres on a "scrollé"
      const lettersMoved = Math.floor(accumulatorRef.current / LETTER_HEIGHT);
      if (lettersMoved !== 0) {
        accumulatorRef.current -= lettersMoved * LETTER_HEIGHT;
        
        // Changer les lettres une par une
        for (let i = 0; i < Math.abs(lettersMoved); i++) {
          changeLetter(lettersMoved > 0 ? 1 : -1);
        }
      }
      
      // Offset visuel pour le smooth scrolling
      setVisualOffset(-accumulatorRef.current * 0.8);
      
      animationRef.current = requestAnimationFrame(animateInertia);
    } else {
      velocityRef.current = 0;
      accumulatorRef.current = 0;
      setVisualOffset(0);
    }
  }, [changeLetter]);

  // Démarrer le drag
  const handleStart = useCallback((clientY: number) => {
    if (isLocked) return;
    
    // Arrêter l'animation en cours
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    setIsDragging(true);
    lastYRef.current = clientY;
    lastTimeRef.current = performance.now();
    velocityRef.current = 0;
    accumulatorRef.current = 0;
  }, [isLocked]);

  // Pendant le drag
  const handleMove = useCallback((clientY: number) => {
    if (!isDragging || isLocked) return;

    const now = performance.now();
    const deltaY = lastYRef.current - clientY;
    const deltaTime = now - lastTimeRef.current;
    
    // Calculer la vélocité
    if (deltaTime > 0) {
      velocityRef.current = deltaY / deltaTime * 16; // Normaliser à ~60fps
    }
    
    // Accumuler le déplacement
    accumulatorRef.current += deltaY;
    
    // Changement de lettre immédiat si on dépasse le seuil
    const threshold = 18; // Seuil réduit pour plus de réactivité
    const lettersMoved = Math.floor(accumulatorRef.current / threshold);
    
    if (lettersMoved !== 0) {
      accumulatorRef.current -= lettersMoved * threshold;
      
      for (let i = 0; i < Math.abs(lettersMoved); i++) {
        changeLetter(lettersMoved > 0 ? 1 : -1);
      }
    }
    
    // Offset visuel fluide
    setVisualOffset(-accumulatorRef.current * 0.6);
    
    lastYRef.current = clientY;
    lastTimeRef.current = now;
  }, [isDragging, isLocked, changeLetter]);

  // Fin du drag - lancer l'inertie
  const handleEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    
    // Si vélocité significative, lancer l'inertie
    if (Math.abs(velocityRef.current) > 2) {
      animationRef.current = requestAnimationFrame(animateInertia);
    } else {
      setVisualOffset(0);
      accumulatorRef.current = 0;
    }
  }, [isDragging, animateInertia]);

  // Molette de souris
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (isLocked) return;
    e.preventDefault();
    changeLetter(e.deltaY > 0 ? 1 : -1);
  }, [isLocked, changeLetter]);

  // Touch events
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    handleStart(e.touches[0].clientY);
  }, [handleStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    handleMove(e.touches[0].clientY);
  }, [handleMove]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Lettres visibles
  const getVisibleLetters = () => {
    const result = [];
    for (let i = -2; i <= 2; i++) {
      const letterIndex = (currentIndex + i + LETTERS.length) % LETTERS.length;
      result.push({
        letter: LETTERS[letterIndex],
        offset: i,
      });
    }
    return result;
  };

  // Style de glow
  const getGlowStyle = () => {
    if (isCorrect === true) {
      return {
        boxShadow: '0 0 20px rgba(34, 197, 94, 0.6), 0 0 40px rgba(34, 197, 94, 0.3), inset 0 0 15px rgba(34, 197, 94, 0.2)',
        borderColor: '#22c55e',
      };
    }
    if (isCorrect === false) {
      return {
        boxShadow: '0 0 20px rgba(239, 68, 68, 0.6), 0 0 40px rgba(239, 68, 68, 0.3)',
        borderColor: '#ef4444',
      };
    }
    return {
      boxShadow: isDragging 
        ? '0 0 30px rgba(212, 175, 55, 0.4), 0 8px 25px rgba(0,0,0,0.5)'
        : '0 8px 25px rgba(0,0,0,0.5)',
      borderColor: isDragging ? '#d4af37' : '#b87333',
    };
  };

  return (
    <motion.div
      initial={{ opacity: 0, rotateX: -90, scale: 0.8 }}
      animate={{ opacity: 1, rotateX: 0, scale: 1 }}
      transition={{ delay: index * 0.1, type: 'spring', stiffness: 120, damping: 15 }}
      className="relative flex-shrink-0"
    >
      {/* Anneau décoratif externe */}
      <div 
        className="absolute -inset-1 rounded-xl opacity-60"
        style={{
          background: 'conic-gradient(from 0deg, #3d1f08, #8b4513, #cd7f32, #8b4513, #3d1f08)',
          filter: 'blur(2px)',
        }}
      />

      {/* Container principal */}
      <div
        ref={containerRef}
        className={`
          relative w-12 h-32 sm:w-14 sm:h-36 md:w-16 md:h-40
          select-none rounded-xl overflow-hidden
          ${isLocked ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}
        `}
        style={{ 
          touchAction: 'none',
          border: '3px solid',
          transition: 'box-shadow 0.15s, border-color 0.15s',
          ...getGlowStyle(),
        }}
        onMouseDown={(e) => handleStart(e.clientY)}
        onMouseMove={(e) => handleMove(e.clientY)}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleEnd}
        onTouchCancel={handleEnd}
        onWheel={handleWheel}
      >
        {/* Texture bois/métal */}
        <div 
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, 
              #a0522d 0%, #8b4513 8%, #6b3410 20%, #4a2508 35%,
              #3d1f08 50%, #4a2508 65%, #6b3410 80%, #8b4513 92%, #a0522d 100%
            )`,
          }}
        />
        
        {/* Rainures */}
        <div className="absolute inset-0 opacity-30">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 w-px"
              style={{
                left: `${15 + i * 14}%`,
                background: 'linear-gradient(180deg, rgba(205,133,63,0.3), rgba(0,0,0,0.5), rgba(205,133,63,0.3))',
              }}
            />
          ))}
        </div>

        {/* Zone des lettres */}
        <div 
          className="absolute inset-x-1.5 inset-y-3 rounded-lg"
          style={{
            background: 'radial-gradient(ellipse at 50% 30%, #1a1612 0%, #0f0d0a 100%)',
            boxShadow: 'inset 0 4px 15px rgba(0,0,0,0.9), inset 0 -4px 15px rgba(0,0,0,0.9)',
          }}
        >
          {/* Lettres */}
          <div 
            className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
            style={{ transform: `translateY(${visualOffset}px)` }}
          >
            {getVisibleLetters().map(({ letter, offset }) => {
              const isCenter = offset === 0;
              const absOffset = Math.abs(offset);
              const opacity = isCenter ? 1 : offset === 1 || offset === -1 ? 0.35 : 0.12;
              const scale = isCenter ? 1.15 : 1 - absOffset * 0.22;
              const yOffset = offset * 24;
              
              return (
                <div
                  key={`${letter}-${offset}`}
                  className="absolute flex items-center justify-center will-change-transform"
                  style={{
                    transform: `translateY(${yOffset}px) scale(${scale})`,
                    opacity,
                  }}
                >
                  <span
                    className="font-display text-2xl sm:text-3xl md:text-4xl font-bold"
                    style={{
                      color: isCenter 
                        ? isCorrect === true ? '#4ade80'
                          : isCorrect === false ? '#f87171'
                          : '#f5e6d3'
                        : '#5c4d3d',
                      textShadow: isCenter 
                        ? isCorrect === true
                          ? '0 0 20px rgba(74, 222, 128, 0.8), 0 0 40px rgba(74, 222, 128, 0.4)'
                          : isCorrect === false
                            ? '0 0 20px rgba(248, 113, 113, 0.8)'
                            : '0 0 15px rgba(212, 175, 55, 0.6), 0 2px 4px rgba(0,0,0,0.8)'
                        : 'none',
                    }}
                  >
                    {letter}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Indicateur central */}
          <div 
            className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-10 pointer-events-none"
            style={{
              background: `linear-gradient(180deg,
                transparent 0%, rgba(212, 175, 55, 0.08) 30%,
                rgba(212, 175, 55, 0.15) 50%, rgba(212, 175, 55, 0.08) 70%, transparent 100%
              )`,
              borderTop: '1px solid rgba(212, 175, 55, 0.3)',
              borderBottom: '1px solid rgba(212, 175, 55, 0.3)',
            }}
          />

          {/* Indicateur de drag actif */}
          {isDragging && (
            <div 
              className="absolute inset-0 rounded-lg pointer-events-none"
              style={{
                background: 'radial-gradient(circle, rgba(212,175,55,0.15) 0%, transparent 70%)',
              }}
            />
          )}
        </div>

        {/* Capuchon supérieur */}
        <div 
          className="absolute top-0 inset-x-0 h-3 rounded-t-xl"
          style={{
            background: 'linear-gradient(180deg, #deb887 0%, #cd853f 30%, #b87333 60%, #8b4513 100%)',
            boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.4), 0 2px 4px rgba(0,0,0,0.3)',
          }}
        >
          <div className="absolute top-1 left-1.5 w-1.5 h-1.5 rounded-full bg-gradient-to-br from-amber-200 to-amber-600" />
          <div className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-gradient-to-br from-amber-200 to-amber-600" />
        </div>
        
        {/* Capuchon inférieur */}
        <div 
          className="absolute bottom-0 inset-x-0 h-3 rounded-b-xl"
          style={{
            background: 'linear-gradient(0deg, #654321 0%, #8b4513 40%, #b87333 70%, #cd853f 100%)',
            boxShadow: 'inset 0 -1px 2px rgba(0,0,0,0.4)',
          }}
        >
          <div className="absolute bottom-1 left-1.5 w-1.5 h-1.5 rounded-full bg-gradient-to-br from-amber-600 to-amber-900" />
          <div className="absolute bottom-1 right-1.5 w-1.5 h-1.5 rounded-full bg-gradient-to-br from-amber-600 to-amber-900" />
        </div>

        {/* Anneaux décoratifs */}
        {[25, 50, 75].map((pos) => (
          <div
            key={pos}
            className="absolute left-0 right-0 h-px pointer-events-none"
            style={{
              top: `${pos}%`,
              background: 'linear-gradient(90deg, #8b4513, #cd7f32, #8b4513)',
              opacity: 0.4,
            }}
          />
        ))}

        {/* Ombres */}
        <div 
          className="absolute left-0 top-3 bottom-3 w-2 pointer-events-none"
          style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.5), transparent)' }}
        />
        <div 
          className="absolute right-0 top-3 bottom-3 w-1 pointer-events-none"
          style={{ background: 'linear-gradient(270deg, rgba(255,255,255,0.1), transparent)' }}
        />
      </div>

      {/* Numéro */}
      <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-amber-800/40 font-display">
        {index + 1}
      </div>
    </motion.div>
  );
}
