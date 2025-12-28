import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CodeEntry } from './components/CodeEntry';
import { Login } from './components/Login';
import { CryptexGame } from './components/CryptexGame';
import { Victory } from './components/Victory';
import { AdminPanel } from './components/AdminPanel';
import { WaitingRoom } from './components/WaitingRoom';
import { useGameStore } from './stores/gameStore';
import { useGameSync } from './hooks/useGameSync';
import { Loader2 } from 'lucide-react';

function App() {
  const { view, isAuthenticated, session, isAdmin, isWaitingForStart, user } = useGameStore();
  const [isHydrated, setIsHydrated] = useState(false);
  
  // Use the sync hook to keep game state in sync with server
  useGameSync();

  // Attendre que zustand soit hydraté depuis localStorage
  useEffect(() => {
    // Zustand persist hydrate est synchrone, mais on attend un tick pour être sûr
    const timer = setTimeout(() => setIsHydrated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Déterminer quelle vue afficher basé sur l'état SANS JAMAIS MODIFIER L'ÉTAT
  const renderView = () => {
    // Si pas encore hydraté, on attend
    if (!isHydrated) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-stone-950">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-4" />
            <p className="text-amber-700">Chargement...</p>
          </div>
        </div>
      );
    }

    // Pas authentifié → écran de code
    if (!isAuthenticated || !user) {
      return <CodeEntry key="code" />;
    }

    // Authentifié mais pas de session → login
    if (!session) {
      return <Login key="login" />;
    }

    // Admin → panneau admin
    if (isAdmin) {
      return <AdminPanel key="admin" />;
    }

    // Partie terminée → victoire
    if (session.isComplete) {
      return <Victory key="victory" />;
    }

    // En attente du lancement → waiting room
    if (isWaitingForStart) {
      return <WaitingRoom key="waiting" />;
    }

    // Sinon → jeu
    return <CryptexGame key="game" />;
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${isAuthenticated}-${isAdmin}-${isWaitingForStart}-${session?.isComplete}-${isHydrated}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="min-h-screen"
      >
        {renderView()}
      </motion.div>
    </AnimatePresence>
  );
}

export default App;
