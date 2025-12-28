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
  const { view, isAuthenticated, session, isAdmin, isWaitingForStart, setView, checkReconnect, user, gameId } = useGameStore();
  const [isLoading, setIsLoading] = useState(true);
  
  // Use the sync hook to keep game state in sync with server
  useGameSync();

  // Restore view on mount based on persisted state AND sync with server
  useEffect(() => {
    const initializeView = async () => {
      setIsLoading(true);
      
      // Si l'utilisateur était connecté (données persistantes), essayer de reconnecter
      if (user && !isAdmin && gameId) {
        const reconnected = await checkReconnect();
        if (reconnected) {
          setIsLoading(false);
          return;
        }
        // Si la reconnexion échoue, le store a déjà reset l'état
      }
      
      if (!isAuthenticated) {
        setView('code');
      } else if (isAdmin) {
        setView('game'); // Admin panel is shown when isAdmin
      } else if (session?.isComplete) {
        setView('victory');
      } else if (session) {
        setView('game');
      } else {
        setView('login');
      }
      
      // Small delay to allow sync hook to run
      await new Promise(resolve => setTimeout(resolve, 300));
      setIsLoading(false);
    };
    
    initializeView();
  }, []);

  const renderView = () => {
    // Handle admin view
    if (isAdmin && view === 'game') {
      return <AdminPanel key="admin" />;
    }

    // Handle waiting room for players (including those who need to enter game code)
    // Players go to WaitingRoom if:
    // 1. They don't have a gameId (need to enter game code)
    // 2. Or the game hasn't started yet (isWaitingForStart)
    if (!isAdmin && view === 'game' && (!gameId || isWaitingForStart)) {
      return <WaitingRoom key="waiting" />;
    }

    switch (view) {
      case 'code':
        return <CodeEntry key="code" />;
      case 'login':
        return <Login key="login" />;
      case 'game':
        return <CryptexGame key="game" />;
      case 'victory':
        return <Victory key="victory" />;
      default:
        return <CodeEntry key="code-default" />;
    }
  };

  // Show loading screen while initializing
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-950">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-4" />
          <p className="text-amber-700">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${view}-${isAdmin}-${isWaitingForStart}`}
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
