// ── App component ───────────────────────────────────────────────────
import React from 'react';
import { Navbar } from './components/Navbar';
import { Board } from './components/Board';
import { useCards } from './hooks/useCards';
import { getBugConfig } from './bugs';

const App: React.FC = () => {
  const { loading, error, moveCard, getCardsByColumn } = useCards();
  const cfg = getBugConfig();

  // Active bug indicators (dev only)
  const activeBugs = [
    cfg.bug1 && 'Bug 1: Race Condition',
    cfg.bug2 && 'Bug 2: Z-Index',
    cfg.bug3 && 'Bug 3: Clipping',
  ].filter(Boolean);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      {/* Bug indicator bar */}
      {activeBugs.length > 0 && (
        <div className="bg-red-600 text-white text-xs font-medium px-4 py-1.5 text-center">
          Active: {activeBugs.join(' · ')}
        </div>
      )}

      {/* Loading / Error states */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-400 text-lg">Loading cards…</div>
        </div>
      )}
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-2 text-sm text-center">
          Error: {error}
        </div>
      )}

      {/* Board */}
      {!loading && <Board getCardsByColumn={getCardsByColumn} moveCard={moveCard} />}
    </div>
  );
};

export default App;
