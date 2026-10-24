// ── App component ───────────────────────────────────────────────────
import React, { useState, useMemo, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Board } from './components/Board';
import { useCards } from './hooks/useCards';
import { getBugConfig } from './bugs';
import type { FilterOptions, ColumnId, CardData } from './types';

const App: React.FC = () => {
  const { cards, loading, error, moveCard, fetchCards } = useCards();
  const [bugRefreshKey, setBugRefreshKey] = useState(0);
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    priority: 'all',
    assignee: 'all',
    tag: 'all',
  });

  const cfg = getBugConfig();

  const handleBugConfigChange = useCallback(() => {
    setBugRefreshKey((prev) => prev + 1);
  }, []);

  const activeBugCount = [cfg.bug1, cfg.bug2, cfg.bug3].filter(Boolean).length;

  // Filtered cards calculation
  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      // 1. Search term match
      if (filters.search.trim()) {
        const q = filters.search.toLowerCase();
        const matchesTitle = card.title.toLowerCase().includes(q);
        const matchesKey = card.key ? card.key.toLowerCase().includes(q) : false;
        const matchesDesc = card.description.toLowerCase().includes(q);
        const matchesTag = card.tags ? card.tags.some((t) => t.toLowerCase().includes(q)) : false;
        if (!matchesTitle && !matchesKey && !matchesDesc && !matchesTag) {
          return false;
        }
      }

      // 2. Priority match
      if (filters.priority !== 'all') {
        if (card.priority !== filters.priority) {
          return false;
        }
      }

      // 3. Assignee match
      if (filters.assignee !== 'all') {
        if (card.assignee !== filters.assignee) {
          return false;
        }
      }

      return true;
    });
  }, [cards, filters]);

  const getCardsByColumn = useCallback(
    (colId: ColumnId): CardData[] => {
      return filteredCards.filter((c) => c.column === colId);
    },
    [filteredCards]
  );

  return (
    <div key={bugRefreshKey} className="min-h-screen flex bg-midnight-950 text-vanilla-100 overflow-hidden font-sans">
      {/* Sleek Dark Left Sidebar */}
      <Sidebar activeBugCount={activeBugCount} onBugConfigChange={handleBugConfigChange} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Navigation & Filter Bar */}
        <Navbar
          filters={filters}
          onFilterChange={setFilters}
          onOpenNewCard={() => {}}
        />

        {/* Loading / Error states */}
        {loading && (
          <div className="flex-1 flex items-center justify-center bg-midnight-950">
            <div className="flex items-center gap-3 text-vanilla-muted text-sm">
              <span className="w-4 h-4 border-2 border-midnight-indigo border-t-transparent rounded-full animate-spin" />
              <span>Loading Linear board state…</span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-rose-950/80 text-rose-300 px-4 py-2.5 text-xs text-center border-b border-rose-800 flex items-center justify-center gap-2">
            <span>Failed to sync with API server: {error}</span>
            <button
              onClick={fetchCards}
              className="underline hover:text-white font-medium ml-2 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Scrollable Board */}
        {!loading && (
          <div className="flex-1 overflow-auto flex flex-col">
            <Board
              getCardsByColumn={getCardsByColumn}
              moveCard={moveCard}
              onAddCard={() => {}}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
