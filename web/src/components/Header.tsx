import React from 'react';
import { BugIcon, ShieldCheckIcon, PlayIcon, RefreshCwIcon, WifiIcon } from './icons';
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
    <header className="bg-[#0e131f] border-b border-slate-800/80 px-5 py-3 sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-[1700px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand & Tagline */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/10">
            <span className="text-xl">⏱️</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                ChronoLens<span className="text-indigo-400 font-semibold">-SWE</span>
              </h1>
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 rounded-full border border-indigo-500/20">
                Meta Hackathon · Indie Track
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Frame-by-Frame AI Visual Regression Debugger · SAM 3.1 &amp; Muse Wonder
            </p>
          </div>
        </div>

        {/* Preset Bug Selector */}
        <div className="flex items-center gap-1.5 bg-[#141b2d] p-1 rounded-xl border border-slate-800">
          {Object.values(sessions).map((session) => {
            const isSelected = session.run_id === currentSession.run_id;
            return (
              <button
                key={session.run_id}
                onClick={() => onSelectSession(session.run_id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <BugIcon size={14} className={isSelected ? 'text-indigo-200' : 'text-slate-500'} />
                <span>Bug {session.bug_number}:</span>
                <span className="opacity-90">{session.bug_title.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Actions & Health Status */}
        <div className="flex items-center gap-3">
          {/* Backend Connection Badge */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
              backendOnline
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}
            title={backendOnline ? 'Connected to FastAPI backend' : 'Backend offline (using offline mock sessions)'}
          >
            <span className={`w-2 h-2 rounded-full ${backendOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span>{backendOnline ? 'Backend Online' : 'Standalone Mode'}</span>
          </div>

          {/* New Run Button */}
          <button
            onClick={onOpenNewRun}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-semibold rounded-lg shadow-md shadow-indigo-600/25 transition-all border border-indigo-400/30 active:scale-95"
          >
            <PlayIcon size={13} />
            <span>Launch Pipeline Run</span>
          </button>
        </div>
      </div>
    </header>
  );
};
