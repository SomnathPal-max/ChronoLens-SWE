// ── Navbar component ────────────────────────────────────────────────
import React from 'react';
import { SearchIcon, FilterIcon, BugIcon } from './icons';
import type { FilterOptions, PriorityLevel } from '../types';
import { getBugConfig } from '../bugs';

interface NavbarProps {
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
  onOpenNewCard?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ filters, onFilterChange }) => {
  const cfg = getBugConfig();
  const activeBugs = [
    cfg.bug1 && 'Bug 1: Race Snapback',
    cfg.bug2 && 'Bug 2: Stacking Trap',
    cfg.bug3 && 'Bug 3: Flex Clipping',
  ].filter(Boolean);

  const priorities: { label: string; value: PriorityLevel | 'all'; dot: string }[] = [
    { label: 'All', value: 'all', dot: 'bg-vanilla-muted' },
    { label: 'Urgent', value: 'urgent', dot: 'bg-rose-400' },
    { label: 'High', value: 'high', dot: 'bg-amber-400' },
    { label: 'Medium', value: 'medium', dot: 'bg-midnight-glow' },
    { label: 'Low', value: 'low', dot: 'bg-emerald-400' },
  ];

  return (
    <nav
      data-cl="navbar"
      className="bg-midnight-950/95 backdrop-blur-md border-b border-midnight-700/80 text-vanilla-100 px-6 py-2.5 sticky top-0 shadow-lg z-[1000]"
      style={{ zIndex: 1000, position: 'sticky' }}
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Search */}
        <div className="flex items-center gap-4 flex-1 min-w-[280px]">
          <div className="flex items-center gap-2 font-semibold text-sm tracking-tight text-vanilla-100">
            <span className="w-2.5 h-2.5 rounded-full bg-midnight-indigo shadow-[0_0_8px_rgba(94,108,231,0.6)]"></span>
            <span>ChronoLens Kanban</span>
            <span className="text-vanilla-dim text-xs font-normal">Midnight Indigo & Vanilla</span>
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 max-w-xs">
            <SearchIcon className="absolute left-2.5 top-2.5 text-vanilla-dim" size={14} />
            <input
              type="text"
              placeholder="Filter issues (title, key, tag)..."
              value={filters.search}
              onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
              className="w-full pl-8 pr-3 py-1.5 bg-midnight-900 hover:bg-midnight-850 focus:bg-midnight-850 text-vanilla-100 placeholder-vanilla-dim text-xs rounded-lg border border-midnight-700/80 focus:border-midnight-indigo focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Priority Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <span className="text-[11px] text-vanilla-dim flex items-center gap-1 mr-1">
            <FilterIcon size={11} /> Priority:
          </span>
          {priorities.map((p) => {
            const isSelected = filters.priority === p.value;
            return (
              <button
                key={p.value}
                onClick={() => onFilterChange({ ...filters, priority: p.value })}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all border ${
                  isSelected
                    ? 'bg-vanilla-100 text-midnight-950 border-vanilla-200 font-semibold shadow-[0_0_12px_rgba(253,248,236,0.2)]'
                    : 'bg-midnight-900/80 text-vanilla-muted border-midnight-700/60 hover:bg-midnight-850 hover:text-vanilla-100'
                }`}
              >
                <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${p.dot}`} />
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Active Bug Badge & User Avatar */}
        <div className="flex items-center gap-3">
          {activeBugs.length > 0 ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/60 text-amber-200 border border-amber-500/50 text-xs font-medium animate-pulse">
              <BugIcon size={12} className="text-amber-300" />
              <span>{activeBugs.join(' · ')}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/40 text-emerald-300 border border-emerald-600/40 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Healthy Baseline</span>
            </div>
          )}

          <div
            className="w-7 h-7 rounded-full bg-midnight-indigo flex items-center justify-center text-xs font-bold text-vanilla-50 shadow ring-1 ring-vanilla-200/20"
            title="Active Engineer: Alice M."
          >
            AM
          </div>
        </div>
      </div>
    </nav>
  );
};
