import React, { useState } from 'react';
import {
  LayersIcon,
  BugIcon,
  CheckCircleIcon,
  SparklesIcon,
  LayoutGridIcon,
  ListTodoIcon,
  ExternalLinkIcon,
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
      className={`bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col transition-all duration-200 select-none ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Workspace Brand */}
      <div className="h-14 border-b border-slate-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0">
            ▲
          </div>
          {!isCollapsed && (
            <div className="truncate">
              <div className="font-semibold text-slate-100 text-sm tracking-tight truncate">Acme Core Platform</div>
              <div className="text-[10px] text-indigo-400 font-medium">Sprint 42 · In Flight</div>
            </div>
          )}
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-slate-500 hover:text-slate-300 p-1 rounded hover:bg-slate-800 transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? '→' : '←'}
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 py-4 px-2 space-y-6 overflow-y-auto">
        <div>
          {!isCollapsed && (
            <div className="px-2 mb-1.5 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
              Views
            </div>
          )}
          <div className="space-y-1">
            <button className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-white shadow-sm">
              <LayoutGridIcon size={15} className="text-indigo-400" />
              {!isCollapsed && <span>Board</span>}
            </button>
            <button className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 transition-colors">
              <ListTodoIcon size={15} />
              {!isCollapsed && <span>List</span>}
            </button>
            <button className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 transition-colors">
              <LayersIcon size={15} />
              {!isCollapsed && <span>Roadmap</span>}
            </button>
          </div>
        </div>

        {/* Bug Simulator Controller */}
        <div>
          {!isCollapsed && (
            <div className="px-2 mb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-wider text-amber-400/90 uppercase flex items-center gap-1">
                <BugIcon size={12} />
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
                  ? 'bg-amber-950/40 text-amber-300 border-amber-700/50'
                  : 'bg-slate-800/40 text-slate-400 border-slate-800 hover:bg-slate-800'
              }`}
              title="Bug 1: Stale response overwrites optimistic move (800ms race condition)"
            >
              <div className="flex items-center gap-2 truncate">
                <span className={`w-2 h-2 rounded-full ${cfg.bug1 ? 'bg-amber-400 animate-pulse' : 'bg-slate-600'}`} />
                {!isCollapsed && <span className="truncate">1. Cache Race Snapback</span>}
              </div>
              {!isCollapsed && <span className="text-[10px] font-mono text-slate-500">?bug=1</span>}
            </button>

            <button
              onClick={() => toggleBug('bug2')}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors border ${
                cfg.bug2
                  ? 'bg-amber-950/40 text-amber-300 border-amber-700/50'
                  : 'bg-slate-800/40 text-slate-400 border-slate-800 hover:bg-slate-800'
              }`}
              title="Bug 2: Modal dialog sits under sticky top navbar due to stacking context"
            >
              <div className="flex items-center gap-2 truncate">
                <span className={`w-2 h-2 rounded-full ${cfg.bug2 ? 'bg-amber-400 animate-pulse' : 'bg-slate-600'}`} />
                {!isCollapsed && <span className="truncate">2. Stacking Context Trap</span>}
              </div>
              {!isCollapsed && <span className="text-[10px] font-mono text-slate-500">?bug=2</span>}
            </button>

            <button
              onClick={() => toggleBug('bug3')}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors border ${
                cfg.bug3
                  ? 'bg-amber-950/40 text-amber-300 border-amber-700/50'
                  : 'bg-slate-800/40 text-slate-400 border-slate-800 hover:bg-slate-800'
              }`}
              title="Bug 3: Add New Card button label clipped at 360px viewport"
            >
              <div className="flex items-center gap-2 truncate">
                <span className={`w-2 h-2 rounded-full ${cfg.bug3 ? 'bg-amber-400 animate-pulse' : 'bg-slate-600'}`} />
                {!isCollapsed && <span className="truncate">3. Flex Grid Clipping</span>}
              </div>
              {!isCollapsed && <span className="text-[10px] font-mono text-slate-500">?bug=3</span>}
            </button>
          </div>
        </div>

        {/* ChronoLens Scrubber Link */}
        <div>
          {!isCollapsed && (
            <div className="px-2 mb-1.5 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
              Telemetry
            </div>
          )}
          <a
            href="/"
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium bg-indigo-950/30 text-indigo-300 border border-indigo-800/40 hover:bg-indigo-900/40 transition-colors"
          >
            <SparklesIcon size={14} className="text-indigo-400" />
            {!isCollapsed && (
              <div className="flex items-center justify-between flex-1">
                <span>ChronoLens Scrubber</span>
                <span className="text-slate-400 text-[10px]">/</span>
              </div>
            )}
          </a>
        </div>
      </div>

      {/* Footer Info */}
      {!isCollapsed && (
        <div className="p-3 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
          <span>Ground Truth: {activeBugCount} active</span>
          <span className="text-emerald-400">● Probe Sync</span>
        </div>
      )}
    </aside>
  );
};
