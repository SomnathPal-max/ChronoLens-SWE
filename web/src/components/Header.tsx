import React from 'react';
import { BugIcon, PlayIcon, ExternalLinkIcon } from './icons';
import { ScrubberSession } from '../types';

interface HeaderProps {
  currentSession: ScrubberSession;
  sessions: Record<string, ScrubberSession>;
  onSelectSession: (sessionId: string) => void;
  onOpenNewRun: () => void;
  backendOnline: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentSession,
  sessions,
  onSelectSession,
  onOpenNewRun,
  backendOnline,
}) => {
  return (
    <header className="bg-obsidian-surface/95 border-b border-obsidian-subtle px-5 py-3 sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-[1700px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Technical Monogram & Identity */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-obsidian-panel border border-obsidian-border flex items-center justify-center text-amber-brand shadow-inner">
            {/* Precision Reticle Lens Icon */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" className="stroke-ink-secondary" />
              <circle cx="12" cy="12" r="3" className="stroke-amber-brand fill-amber-brand/20" />
              <line x1="12" y1="3" x2="12" y2="7" className="stroke-amber-brand" />
              <line x1="12" y1="17" x2="12" y2="21" className="stroke-amber-brand" />
              <line x1="3" y1="12" x2="7" y2="12" className="stroke-amber-brand" />
              <line x1="17" y1="12" x2="21" y2="12" className="stroke-amber-brand" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-wider text-ink-primary font-mono uppercase">
                ChronoLens<span className="text-amber-brand font-bold">-SWE</span>
              </h1>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-obsidian-panel text-ink-tertiary border border-obsidian-subtle">
                v0.1.0
              </span>
            </div>
            <p className="text-[11px] text-ink-secondary">
              Frame-by-Frame Visual Regression Debugger · SAM 3.1 &amp; Muse Wonder
            </p>
          </div>
        </div>

        {/* Recessed Segmented Bug Selector */}
        <div className="flex items-center gap-1 bg-obsidian-canvas p-1 rounded-lg border border-obsidian-subtle">
          {Object.values(sessions).map((session) => {
            const isSelected = session.run_id === currentSession.run_id;
            return (
              <button
                key={session.run_id}
                onClick={() => onSelectSession(session.run_id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'bg-obsidian-elevated text-ink-primary border border-obsidian-border shadow-sm'
                    : 'text-ink-tertiary hover:text-ink-secondary hover:bg-obsidian-surface'
                }`}
              >
                <BugIcon size={13} className={isSelected ? 'text-amber-brand' : 'text-ink-dim'} />
                <span className="font-mono text-[11px]">BUG {session.bug_number}:</span>
                <span className="font-sans text-xs">{session.bug_title.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Actions & Health Status */}
        <div className="flex items-center gap-2.5">
          {/* Link to embedded Kanban Demo */}
          <a
            href="/demo"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-obsidian-panel hover:bg-obsidian-elevated text-ink-secondary hover:text-ink-primary transition-colors border border-obsidian-subtle hover:border-obsidian-border"
            title="Open embedded Kanban test subject board"
          >
            <ExternalLinkIcon size={12} className="text-ink-tertiary" />
            <span>Live Kanban App</span>
          </a>

          {/* Backend Connection Badge */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono border ${
              backendOnline
                ? 'bg-emerald-950/30 text-emerald-400 border-emerald-800/40'
                : 'bg-amber-950/30 text-amber-400 border-amber-800/40'
            }`}
            title={backendOnline ? 'Connected to FastAPI backend' : 'Backend offline (using offline mock sessions)'}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${backendOnline ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span>{backendOnline ? 'API ONLINE' : 'STANDALONE'}</span>
          </div>

          {/* New Run Button (Crisp Industrial Amber) */}
          <button
            onClick={onOpenNewRun}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-brand hover:bg-amber-hover text-obsidian-canvas text-xs font-semibold rounded-md shadow-sm transition-all active:scale-[0.98]"
          >
            <PlayIcon size={12} className="fill-current" />
            <span>New Run</span>
          </button>
        </div>
      </div>
    </header>
  );
};
