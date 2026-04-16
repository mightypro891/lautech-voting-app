import { useEffect, useState } from 'react';
import { Candidate } from '../types';

interface FavoritesManagerProps {
  candidates: Candidate[];
  onFavoritesChange?: (favorites: Candidate[]) => void;
}

export default function FavoritesManager({ candidates, onFavoritesChange }: FavoritesManagerProps) {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('favoriteCandidateIds');
    if (stored) {
      const parsed = JSON.parse(stored);
      setFavorites(parsed);
    }
  }, []);

  const toggleFavorite = (candidateId: string) => {
    const updated = favorites.includes(candidateId)
      ? favorites.filter((id) => id !== candidateId)
      : [...favorites, candidateId];

    setFavorites(updated);
    localStorage.setItem('favoriteCandidateIds', JSON.stringify(updated));

    if (onFavoritesChange) {
      const favorited = candidates.filter((c) => updated.includes(c.id));
      onFavoritesChange(favorited);
    }
  };

  const isFavorite = (candidateId: string) => favorites.includes(candidateId);

  return { favorites, toggleFavorite, isFavorite };
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('favoriteCandidateIds');
    if (stored) {
      setFavorites(JSON.parse(stored));
    }
  }, []);

  const toggleFavorite = (candidateId: string) => {
    const updated = favorites.includes(candidateId)
      ? favorites.filter((id) => id !== candidateId)
      : [...favorites, candidateId];
    setFavorites(updated);
    localStorage.setItem('favoriteCandidateIds', JSON.stringify(updated));
  };

  return { favorites, toggleFavorite, isFavorite: (id: string) => favorites.includes(id) };
}
