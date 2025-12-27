import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Loader2, Sparkles } from 'lucide-react';

// Giphy API - Clé publique pour le développement
const GIPHY_API_KEY = 'GlVGYHkr3WSBnllca54iNt0yFbjz7L65';
const GIPHY_API = 'https://api.giphy.com/v1/gifs';

interface GiphyGif {
  id: string;
  images: {
    fixed_height_small: {
      url: string;
      width: string;
      height: string;
    };
    fixed_width_small: {
      url: string;
    };
    original: {
      url: string;
    };
  };
  title: string;
}

interface GiphyPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (gifUrl: string) => void;
  currentAvatar?: string;
}

export function GiphyPicker({ isOpen, onClose, onSelect, currentAvatar }: GiphyPickerProps) {
  const [search, setSearch] = useState('');
  const [gifs, setGifs] = useState<GiphyGif[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'trending' | 'search'>('trending');

  const fetchTrending = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${GIPHY_API}/trending?api_key=${GIPHY_API_KEY}&limit=20&rating=g`
      );
      const data = await response.json();
      setGifs(data.data || []);
    } catch (error) {
      console.error('Failed to fetch trending gifs:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const searchGifs = useCallback(async (query: string) => {
    if (!query.trim()) {
      fetchTrending();
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch(
        `${GIPHY_API}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=20&rating=g`
      );
      const data = await response.json();
      setGifs(data.data || []);
    } catch (error) {
      console.error('Failed to search gifs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [fetchTrending]);

  useEffect(() => {
    if (isOpen) {
      fetchTrending();
    }
  }, [isOpen, fetchTrending]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (search && activeTab === 'search') {
        searchGifs(search);
      }
    }, 500);

    return () => clearTimeout(debounce);
  }, [search, activeTab, searchGifs]);

  const handleSelect = (gif: GiphyGif) => {
    onSelect(gif.images.fixed_height_small.url);
    onClose();
  };

  const suggestedSearches = ['adventure', 'explorer', 'treasure', 'happy', 'cool', 'excited'];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg max-h-[80vh] bg-stone-900 border border-amber-800/50 rounded-2xl overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="p-4 border-b border-stone-800 bg-stone-900/95">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg font-semibold text-amber-200 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                Choisir un Avatar
              </h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => {
                  setActiveTab('trending');
                  fetchTrending();
                }}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'trending'
                    ? 'bg-amber-600 text-stone-900'
                    : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                }`}
              >
                🔥 Tendances
              </button>
              <button
                onClick={() => setActiveTab('search')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'search'
                    ? 'bg-amber-600 text-stone-900'
                    : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                }`}
              >
                🔍 Rechercher
              </button>
            </div>

            {/* Search Input */}
            {activeTab === 'search' && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un GIF..."
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-800 border border-stone-700 rounded-lg text-amber-100 placeholder-stone-500 focus:border-amber-600 focus:outline-none"
                  autoFocus
                />
              </div>
            )}

            {/* Suggested searches */}
            {activeTab === 'search' && !search && (
              <div className="flex flex-wrap gap-2 mt-3">
                {suggestedSearches.map((term) => (
                  <button
                    key={term}
                    onClick={() => {
                      setSearch(term);
                      searchGifs(term);
                    }}
                    className="px-3 py-1 text-xs rounded-full bg-stone-800 text-amber-400 hover:bg-stone-700 transition-colors capitalize"
                  >
                    {term}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* GIF Grid */}
          <div className="p-4 overflow-y-auto max-h-[50vh]">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
              </div>
            ) : gifs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-stone-500">Aucun GIF trouvé</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {gifs.map((gif) => (
                  <motion.button
                    key={gif.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSelect(gif)}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      currentAvatar === gif.images.fixed_height_small.url
                        ? 'border-amber-500 ring-2 ring-amber-500/50'
                        : 'border-transparent hover:border-amber-600/50'
                    }`}
                  >
                    <img
                      src={gif.images.fixed_width_small.url}
                      alt={gif.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </motion.button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-stone-800 bg-stone-900/95 flex items-center justify-between">
            <span className="text-xs text-stone-500">Powered by GIPHY</span>
            <button
              onClick={() => {
                onSelect('');
                onClose();
              }}
              className="text-xs text-stone-400 hover:text-red-400 transition-colors"
            >
              Supprimer l'avatar
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

