// ── Navbar component ────────────────────────────────────────────────
import React from 'react';

export const Navbar: React.FC = () => {
  return (
    <nav
      data-cl="navbar"
      className="bg-gray-900 text-white px-6 py-4 sticky top-0 shadow-lg"
      style={{ zIndex: 1000, position: 'sticky' }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
          <h1 className="text-xl font-bold tracking-tight">ChronoLens Kanban</h1>
        </div>
        <div className="text-sm text-gray-400">Demo Board</div>
      </div>
    </nav>
  );
};
