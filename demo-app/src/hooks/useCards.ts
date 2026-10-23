// ── Card state management hook ──────────────────────────────────────
import { useState, useCallback, useEffect, useRef } from 'react';
import type { CardData, ColumnId } from '../types';
import { getBugConfig } from '../bugs';

export function useCards() {
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Request versioning — used to ignore stale responses in healthy mode
  const moveVersionRef = useRef(0);

  // ── Initial fetch ───────────────────────────────────────────────
  const fetchCards = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/cards');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: CardData[] = await res.json();
      setCards(data);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  // ── Move card ─────────────────────────────────────────────────
  const moveCard = useCallback(
    async (cardId: string, targetColumn: ColumnId) => {
      const cfg = getBugConfig();

      // Optimistic update
      setCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, column: targetColumn } : c))
      );

      if (cfg.bug1) {
        // BUG 1 path: NO request versioning — blindly accept server response
        try {
          const res = await fetch(`/api/cards/${cardId}/move`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ column: targetColumn }),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data: CardData[] = await res.json();
          // Blindly overwrite state with server response (which is STALE)
          setCards(data);
        } catch (err) {
          setError((err as Error).message);
          // Revert on error
          fetchCards();
        }
      } else {
        // Healthy path: use version counter to ignore stale responses
        const version = ++moveVersionRef.current;
        try {
          const res = await fetch(`/api/cards/${cardId}/move`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ column: targetColumn }),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data: CardData[] = await res.json();
          // Only apply if this is still the latest request
          if (moveVersionRef.current === version) {
            setCards(data);
          }
        } catch (err) {
          if (moveVersionRef.current === version) {
            setError((err as Error).message);
            fetchCards();
          }
        }
      }
    },
    [fetchCards]
  );

  // ── Helpers ───────────────────────────────────────────────────
  const getCardsByColumn = useCallback(
    (column: ColumnId): CardData[] => cards.filter((c) => c.column === column),
    [cards]
  );

  return { cards, loading, error, moveCard, getCardsByColumn, fetchCards };
}
