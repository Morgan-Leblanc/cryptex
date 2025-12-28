import { useEffect, useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { useGameStore } from '../stores/gameStore';

const API_BASE = '/api/game';

interface PlayerInfo {
  username: string;
  avatar?: string;
}

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

  // Fetch initial SEULEMENT - pas de refresh automatique en waiting room
  // On reste stable, le changement de vue se fera via useGameSync qui détecte isStarted
  useEffect(() => {
    // Fetch initial seulement
    fetchGameState();
    // PAS de visibilitychange listener - on reste stable en waiting room
    // Le changement vers le jeu se fera automatiquement via useGameSync quand isStarted devient true
  }, [fetchGameState]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-yellow-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border-2 border-amber-200">
          <div className="text-center mb-8">
            <div className="inline-block mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-amber-400 blur-xl opacity-50 rounded-full"></div>
                <div className="relative bg-gradient-to-br from-amber-400 to-orange-500 w-20 h-20 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-amber-900 mb-2">
              Salle d'attente
            </h1>
            <p className="text-amber-700">
              En attente du lancement de la partie{dots}
            </p>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-amber-900 mb-4">
              Joueurs connectés ({players.length})
            </h2>
            <div className="space-y-2">
              {players.length === 0 ? (
                <p className="text-amber-600 text-center py-4">Aucun joueur connecté</p>
              ) : (
                players.map((player) => (
                  <div
                    key={player.username}
                    className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200"
                  >
                    {player.avatar ? (
                      <img
                        src={player.avatar}
                        alt={player.username}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center text-white font-bold">
                        {player.username[0].toUpperCase()}
                      </div>
                    )}
                    <span className="text-amber-900 font-medium">{player.username}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="text-center space-y-3">
            <button
              onClick={async () => {
                setIsRefreshing(true);
                await fetchGameState();
                setIsRefreshing(false);
              }}
              disabled={isRefreshing}
              className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors flex items-center gap-2 mx-auto"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Rafraîchissement...' : 'Rafraîchir'}
            </button>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              {isLoggingOut ? 'Déconnexion...' : 'Se déconnecter'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
