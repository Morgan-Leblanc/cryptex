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
  const { isAuthenticated, session, isAdmin, isWaitingForStart, user, accessCode, checkReconnect } = useGameStore();
  const [isHydrated, setIsHydrated] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  
  // Use the sync hook to keep game state in sync with server
  // Le hook se désactive automatiquement si on n'est pas en waiting room
  useGameSync();

  // Attendre que zustand soit hydraté depuis localStorage
  useEffect(() => {
    // Zustand persist hydrate est synchrone, mais on attend un tick pour être sûr
    const timer = setTimeout(() => setIsHydrated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Tentative de reconnexion automatique si l'utilisateur était connecté
  useEffect(() => {
    if (!isHydrated) return;
    
    // Si on a un user et un accessCode mais pas de session → essayer de reconnecter
    if (user && !isAdmin && accessCode && !session && !isReconnecting) {
      setIsReconnecting(true);
      checkReconnect().finally(() => {
        setIsReconnecting(false);
      });
    }
  }, [isHydrated, user, isAdmin, accessCode, session, checkReconnect, isReconnecting]);

  // Déterminer quelle vue afficher basé sur l'état SANS JAMAIS MODIFIER L'ÉTAT
  const renderView = () => {
    // Si pas encore hydraté, on attend
    if (!isHydrated || isReconnecting) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-stone-950">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-4" />
            <p className="text-amber-700">Chargement...</p>
          </div>
        </div>
      );
    }

    // PROTECTION : Si on a un accessCode et un user, on est connecté (même si isAuthenticated est false)
    // Cela évite les rollbacks dus aux erreurs de synchronisation
    const hasValidConnection = (user && accessCode) || (isAuthenticated && user);

    // Pas authentifié ET pas de connexion valide → écran de code
    if (!hasValidConnection) {
      return <CodeEntry key="code" />;
    }

    // Authentifié mais pas de session → login (sauf si on a déjà un accessCode, alors on attend)
    if (!session) {
      // Si on a un accessCode, on est déjà connecté, juste attendre la reconnexion
      if (accessCode && user) {
        // Afficher un loader pendant la reconnexion
        return (
          <div className="min-h-screen flex items-center justify-center bg-stone-950">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-4" />
              <p className="text-amber-700">Reconnexion...</p>
            </div>
          </div>
        );
      }
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

  // Créer une clé stable basée sur la vue actuelle (pas sur tous les états)
  const viewKey = (() => {
    if (!isHydrated || isReconnecting) return 'loading';
    if (!user && !isAuthenticated) return 'code';
    if (isAdmin) return 'admin';
    if (session?.isComplete) return 'victory';
    if (isWaitingForStart) return 'waiting';
    return 'game';
  })();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={viewKey}
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
