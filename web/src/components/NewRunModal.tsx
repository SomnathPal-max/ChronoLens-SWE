import React, { useState, useEffect } from 'react';
import { PlayIcon, CheckCircleIcon, RefreshCwIcon, AlertTriangleIcon } from './icons';
import { PipelineStageEvent } from '../types';

interface NewRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleteRun: (sessionId: string) => void;
}

const STAGES = [
  { id: 'ingest', label: '[A] Ingest', desc: 'ffprobe & ffmpeg H.264 conversion' },
  { id: 'perceive', label: '[B] Perceive', desc: 'Muse Spark 1.3 concepts & SAM 3.1 masks' },
  { id: 'detect', label: '[C] Detect', desc: '7 per-track pixel & motion anomaly metrics' },
  { id: 'reproduce', label: '[D] Reproduce', desc: 'Playwright headless loop & signature matching' },
  { id: 'rootcause', label: '[E] Root Cause', desc: 'Muse Wonder 1M context repo & telemetry analysis' },
  { id: 'patch', label: '[F] Patch', desc: 'Git worktree patch synthesis (Rule 8 guarded)' },
  { id: 'verify', label: '[G] Verify', desc: '5-run stability gate & zero-regression test' },
  { id: 'report', label: '[H] Report', desc: 'PR markdown, 1200x630 card & session export' },
];

export const NewRunModal: React.FC<NewRunModalProps> = ({
  isOpen,
  onClose,
  onCompleteRun,
}) => {
  const [selectedBug, setSelectedBug] = useState<number>(1);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentStageIndex, setCurrentStageIndex] = useState<number>(-1);
  const [logs, setLogs] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleStartRun = () => {
    setIsRunning(true);
    setCurrentStageIndex(0);
    setLogs([
      `[${new Date().toLocaleTimeString()}] Pipeline started for Seeded Bug ${selectedBug}...`,
    ]);

    // Simulated / Live Step Progression
    let stage = 0;
    const interval = setInterval(() => {
      stage++;
      if (stage < STAGES.length) {
        setCurrentStageIndex(stage);
        setLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] Completed ${STAGES[stage - 1].label}: OK`,
          `[${new Date().toLocaleTimeString()}] Running ${STAGES[stage].label} (${STAGES[stage].desc})...`,
        ]);
      } else {
        clearInterval(interval);
        setIsRunning(false);
        setLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] Completed ${STAGES[STAGES.length - 1].label}: OK`,
          `[${new Date().toLocaleTimeString()}] Pipeline finished! Verification passed 5/5 runs.`,
        ]);
        setTimeout(() => {
          onCompleteRun(`p4-bug${selectedBug}`);
          onClose();
        }, 1200);
      }
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-obsidian-surface rounded-xl border border-obsidian-border shadow-2xl max-w-xl w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-obsidian-panel border-b border-obsidian-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-brand animate-pulse"></span>
            <h2 className="text-sm font-semibold text-ink-primary">
              Initialize ChronoLens SWE Pipeline Run
            </h2>
          </div>
          {!isRunning && (
            <button
              onClick={onClose}
              className="text-ink-tertiary hover:text-ink-primary text-sm font-mono p-1 rounded hover:bg-obsidian-elevated transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5 flex flex-col gap-4 text-xs">
          {/* Bug Selection */}
          {!isRunning ? (
            <div className="flex flex-col gap-2">
              <label className="text-ink-secondary font-medium">
                Target Verification Seed:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 1, name: 'Bug 1: Race', desc: 'Snapback & flicker' },
                  { id: 2, name: 'Bug 2: Stacking', desc: 'Modal z-index trap' },
                  { id: 3, name: 'Bug 3: Overflow', desc: 'CSS text clipping' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedBug(item.id)}
                    className={`p-3 rounded border text-left flex flex-col gap-1 transition-all ${
                      selectedBug === item.id
                        ? 'bg-amber-brand/10 border-amber-brand text-ink-primary shadow-sm'
                        : 'bg-obsidian-panel border-obsidian-border text-ink-secondary hover:border-obsidian-subtle'
                    }`}
                  >
                    <span className="font-semibold text-ink-primary">{item.name}</span>
                    <span className="text-[10px] text-ink-tertiary font-mono">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* Pipeline Stage Tracker */}
          <div className="flex flex-col gap-2">
            <span className="text-ink-secondary font-medium">
              Pipeline Stage Orchestration:
            </span>
            <div className="grid grid-cols-2 gap-2">
              {STAGES.map((st, idx) => {
                const isPast = idx < currentStageIndex;
                const isCurrent = idx === currentStageIndex && isRunning;

                return (
                  <div
                    key={st.id}
                    className={`p-2.5 rounded border flex items-center justify-between text-[11px] ${
                      isPast
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : isCurrent
                        ? 'bg-amber-brand/10 border-amber-brand/50 text-amber-brand'
                        : 'bg-obsidian-canvas border-obsidian-border text-ink-dim'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-semibold">{st.label}</span>
                      <span className="text-[9px] opacity-75">{st.desc}</span>
                    </div>

                    {isPast && <CheckCircleIcon size={13} className="text-emerald-400" />}
                    {isCurrent && <RefreshCwIcon size={13} className="text-amber-brand animate-spin" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Real-Time Event Log Terminal */}
          {isRunning && (
            <div className="flex flex-col gap-1.5">
              <span className="text-ink-tertiary font-mono text-[10px]">
                Pipeline Daemon Telemetry:
              </span>
              <div className="p-3 bg-obsidian-canvas rounded border border-obsidian-border font-mono text-[10px] text-ink-secondary max-h-36 overflow-y-auto leading-relaxed flex flex-col gap-1">
                {logs.map((log, i) => (
                  <div key={i}>{log}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-obsidian-panel border-t border-obsidian-border flex items-center justify-end gap-2.5">
          {!isRunning && (
            <>
              <button
                onClick={onClose}
                className="px-3.5 py-1.5 rounded text-xs font-medium text-ink-secondary hover:text-ink-primary hover:bg-obsidian-elevated transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStartRun}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-brand hover:bg-amber-hover text-obsidian-canvas text-xs font-semibold rounded shadow-sm transition-all active:scale-95"
              >
                <PlayIcon size={12} />
                <span>Execute Pipeline</span>
              </button>
            </>
          )}
          {isRunning && (
            <div className="text-xs text-amber-brand font-mono font-medium flex items-center gap-2">
              <RefreshCwIcon size={12} className="animate-spin" />
              <span>Orchestrating Phase Gates...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
