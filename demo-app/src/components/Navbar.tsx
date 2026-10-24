// ── Navbar component ────────────────────────────────────────────────
import React from 'react';
import { SearchIcon, FilterIcon, FlameIcon, BugIcon } from './icons';
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

  const priorities: { label: string; value: PriorityLevel | 'all'; color: string }[] = [
    { label: 'All', value: 'all', color: 'text-slate-400' },
    { label: 'Urgent', value: 'urgent', color: 'text-rose-400' },
    { label: 'High', value: 'high', color: 'text-amber-400' },
    { label: 'Medium', value: 'medium', color: 'text-blue-400' },
    { label: 'Low', value: 'low', color: 'text-emerald-400' },
  ];

  return (
    <nav
      data-cl="navbar"
      className="bg-slate-900 border-b border-slate-800 text-slate-100 px-6 py-2.5 sticky top-0 shadow-md z-[1000]"
      style={{ zIndex: 1000, position: 'sticky' }}
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Search */}
        <div className="flex items-center gap-4 flex-1 min-w-[280px]">
          <div className="flex items-center gap-2 font-semibold text-sm tracking-tight text-white">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            <span>ChronoLens Kanban</span>
            <span className="text-slate-500 text-xs font-normal">v2.0 (Linear-Grade)</span>
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 max-w-xs">
            <SearchIcon className="absolute left-2.5 top-2.5 text-slate-500" size={14} />
            <input
              type="text"
              placeholder="Filter issues (title, key, tag)..."
              value={filters.search}
              onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-800/80 hover:bg-slate-800 focus:bg-slate-800 text-slate-200 placeholder-slate-500 text-xs rounded-lg border border-slate-700/80 focus:border-indigo-500 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Priority Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <span className="text-[11px] text-slate-500 flex items-center gap-1 mr-1">
            <FilterIcon size={11} /> Priority:
          </span>
          {priorities.map((p) => (
            <button
              key={p.value}
              onClick={() => onFilterChange({ ...filters, priority: p.value })}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${
                filters.priority === p.value
                  ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/60'
                  : 'bg-slate-800/50 text-slate-400 border-slate-700/40 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <span className={p.color}>● </span>
              {p.label}
            </button>
          ))}
        </div>

        {/* Active Bug Badge & User Avatar */}
        <div className="flex items-center gap-3">
          {activeBugs.length > 0 ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/60 text-amber-300 border border-amber-600/40 text-xs font-medium animate-pulse">
              <BugIcon size={12} className="text-amber-400" />
              <span>{activeBugs.join(' · ')}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/40 text-emerald-300 border border-emerald-600/40 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Healthy Baseline</span>
            </div>
          )}

          <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow ring-1 ring-white/10" title="Active Engineer: Alice M.">
            AM
          </div>
        </div>
      </div>
    </nav>
  );
};
