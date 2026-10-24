import React, { useState } from 'react';
import {
  LayersIcon,
  BugIcon,
  SparklesIcon,
  LayoutGridIcon,
  ListTodoIcon,
} from './icons';
import { getBugConfig, setBugOverride } from '../bugs';

interface SidebarProps {
  activeBugCount: number;
  onBugConfigChange: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeBugCount, onBugConfigChange }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const cfg = getBugConfig();

  const toggleBug = (bugKey: 'bug1' | 'bug2' | 'bug3') => {
    const current = getBugConfig();
    const next = { ...current, [bugKey]: !current[bugKey] };
    setBugOverride(next);
    onBugConfigChange();
  };

  const setHealthyMode = () => {
    setBugOverride({ bug1: false, bug2: false, bug3: false });
    onBugConfigChange();
  };

  return (
    <aside
      className={`bg-midnight-950 border-r border-midnight-700/70 text-vanilla-muted flex flex-col transition-all duration-200 select-none ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Workspace Brand */}
      <div className="h-14 border-b border-midnight-700/70 flex items-center justify-between px-4">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-7 h-7 rounded-lg bg-midnight-indigo flex items-center justify-center text-vanilla-50 font-bold text-sm shadow-[0_0_12px_rgba(94,108,231,0.35)] flex-shrink-0">
            ▲
          </div>
          {!isCollapsed && (
            <div className="truncate">
              <div className="font-semibold text-vanilla-100 text-sm tracking-tight truncate">Acme Core Platform</div>
              <div className="text-[10px] text-midnight-glow font-medium">Sprint 42 · Midnight & Vanilla</div>
            </div>
          )}
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-vanilla-dim hover:text-vanilla-100 p-1 rounded hover:bg-midnight-850 transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? '→' : '←'}
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 py-4 px-2 space-y-6 overflow-y-auto">
        <div>
          {!isCollapsed && (
            <div className="px-2 mb-1.5 text-[10px] font-bold tracking-wider text-vanilla-dim uppercase">
              Views
            </div>
          )}
          <div className="space-y-1">
            <button className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-midnight-850 text-vanilla-100 border border-midnight-600/50 shadow-sm">
              <LayoutGridIcon size={15} className="text-midnight-glow" />
              {!isCollapsed && <span>Board</span>}
            </button>
            <button className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-vanilla-muted hover:bg-midnight-900 hover:text-vanilla-100 transition-colors">
              <ListTodoIcon size={15} />
              {!isCollapsed && <span>List</span>}
            </button>
            <button className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-vanilla-muted hover:bg-midnight-900 hover:text-vanilla-100 transition-colors">
              <LayersIcon size={15} />
              {!isCollapsed && <span>Roadmap</span>}
            </button>
          </div>
        </div>

        {/* Bug Simulator Controller */}
        <div>
          {!isCollapsed && (
            <div className="px-2 mb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-wider text-vanilla-300 uppercase flex items-center gap-1">
                <BugIcon size={12} className="text-amber-400" />
                Bug Simulation
              </span>
              <button
                onClick={setHealthyMode}
                className="text-[10px] text-emerald-400 hover:underline cursor-pointer"
                title="Disable all bugs (Healthy baseline)"
              >
                Reset All
              </button>
            </div>
          )}

          <div className="space-y-1.5">
            <button
              onClick={() => toggleBug('bug1')}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors border ${
                cfg.bug1
                  ? 'bg-amber-950/50 text-amber-200 border-amber-500/60 shadow-sm'
                  : 'bg-midnight-900/60 text-vanilla-muted border-midnight-700/60 hover:bg-midnight-850 hover:border-midnight-600 hover:text-vanilla-100'
              }`}
              title="Bug 1: Stale response overwrites optimistic move (800ms race condition)"
            >
              <div className="flex items-center gap-2 truncate">
                <span className={`w-2 h-2 rounded-full ${cfg.bug1 ? 'bg-amber-400 animate-pulse' : 'bg-midnight-600'}`} />
                {!isCollapsed && <span className="truncate">1. Cache Race Snapback</span>}
              </div>
              {!isCollapsed && <span className="text-[10px] font-mono text-vanilla-dim">?bug=1</span>}
            </button>

            <button
              onClick={() => toggleBug('bug2')}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors border ${
                cfg.bug2
                  ? 'bg-amber-950/50 text-amber-200 border-amber-500/60 shadow-sm'
                  : 'bg-midnight-900/60 text-vanilla-muted border-midnight-700/60 hover:bg-midnight-850 hover:border-midnight-600 hover:text-vanilla-100'
              }`}
              title="Bug 2: Modal dialog sits under sticky top navbar due to stacking context"
            >
              <div className="flex items-center gap-2 truncate">
                <span className={`w-2 h-2 rounded-full ${cfg.bug2 ? 'bg-amber-400 animate-pulse' : 'bg-midnight-600'}`} />
                {!isCollapsed && <span className="truncate">2. Stacking Context Trap</span>}
              </div>
              {!isCollapsed && <span className="text-[10px] font-mono text-vanilla-dim">?bug=2</span>}
            </button>

            <button
              onClick={() => toggleBug('bug3')}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors border ${
                cfg.bug3
                  ? 'bg-amber-950/50 text-amber-200 border-amber-500/60 shadow-sm'
                  : 'bg-midnight-900/60 text-vanilla-muted border-midnight-700/60 hover:bg-midnight-850 hover:border-midnight-600 hover:text-vanilla-100'
              }`}
              title="Bug 3: Add New Card button label clipped at 360px viewport"
            >
              <div className="flex items-center gap-2 truncate">
                <span className={`w-2 h-2 rounded-full ${cfg.bug3 ? 'bg-amber-400 animate-pulse' : 'bg-midnight-600'}`} />
                {!isCollapsed && <span className="truncate">3. Flex Grid Clipping</span>}
              </div>
              {!isCollapsed && <span className="text-[10px] font-mono text-vanilla-dim">?bug=3</span>}
            </button>
          </div>
        </div>

        {/* ChronoLens Scrubber Link */}
        <div>
          {!isCollapsed && (
            <div className="px-2 mb-1.5 text-[10px] font-bold tracking-wider text-vanilla-dim uppercase">
              Telemetry
            </div>
          )}
          <a
            href="/"
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium bg-midnight-900/90 text-vanilla-200 border border-midnight-indigo/40 hover:bg-midnight-850 hover:border-midnight-indigo transition-colors"
          >
            <SparklesIcon size={14} className="text-midnight-glow" />
            {!isCollapsed && (
              <div className="flex items-center justify-between flex-1">
                <span>ChronoLens Scrubber</span>
                <span className="text-vanilla-dim text-[10px]">/</span>
              </div>
            )}
          </a>
        </div>
      </div>

      {/* Footer Info */}
      {!isCollapsed && (
        <div className="p-3 border-t border-midnight-700/70 text-[10px] text-vanilla-dim flex items-center justify-between">
          <span>Ground Truth: {activeBugCount} active</span>
          <span className="text-emerald-400">● Probe Sync</span>
        </div>
      )}
    </aside>
  );
};
