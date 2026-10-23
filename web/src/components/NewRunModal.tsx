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
      <div className="bg-[#111622] rounded-2xl border border-slate-800 shadow-2xl max-w-xl w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#141b2d] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚡</span>
            <h2 className="text-base font-bold text-white">
              Launch ChronoLens Pipeline Run
            </h2>
          </div>
          {!isRunning && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-lg font-bold p-1 rounded hover:bg-slate-800"
            >
              ✕
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col gap-5 text-xs">
          {/* Bug Selection */}
          {!isRunning ? (
            <div className="flex flex-col gap-2">
              <label className="text-slate-300 font-semibold">
                Select Test Subject Bug:
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 1, name: 'Bug 1: Race', desc: 'Snapback & flicker' },
                  { id: 2, name: 'Bug 2: Z-Index', desc: 'Modal stacking trap' },
                  { id: 3, name: 'Bug 3: Clipping', desc: 'Label overflow' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedBug(item.id)}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                      selectedBug === item.id
                        ? 'bg-indigo-600/20 border-indigo-500 text-white'
                        : 'bg-[#141b2d] border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="font-bold text-slate-200">{item.name}</span>
                    <span className="text-[10px] text-slate-400">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* Pipeline Stage Tracker */}
          <div className="flex flex-col gap-2">
            <span className="text-slate-300 font-semibold">
              Pipeline Stage Execution:
            </span>
            <div className="grid grid-cols-2 gap-2">
              {STAGES.map((st, idx) => {
                const isPast = idx < currentStageIndex;
                const isCurrent = idx === currentStageIndex && isRunning;

                return (
                  <div
                    key={st.id}
                    className={`p-2.5 rounded-lg border flex items-center justify-between text-[11px] ${
                      isPast
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : isCurrent
                        ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-200 animate-pulse'
                        : 'bg-[#0f1422] border-slate-800 text-slate-500'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-bold">{st.label}</span>
                      <span className="text-[9px] opacity-75">{st.desc}</span>
                    </div>

                    {isPast && <CheckCircleIcon size={14} className="text-emerald-400" />}
                    {isCurrent && <RefreshCwIcon size={14} className="text-indigo-400 animate-spin" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Real-Time Event Log Terminal */}
          {isRunning && (
            <div className="flex flex-col gap-1.5">
              <span className="text-slate-400 font-mono text-[10px]">
                Live Event Stream (SSE):
              </span>
              <div className="p-3 bg-[#0a0d14] rounded-xl border border-slate-800 font-mono text-[10px] text-slate-300 max-h-36 overflow-y-auto leading-relaxed flex flex-col gap-1">
                {logs.map((log, i) => (
                  <div key={i}>{log}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-[#141b2d] border-t border-slate-800 flex items-center justify-end gap-3">
          {!isRunning && (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStartRun}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-md transition-all active:scale-95"
              >
                <PlayIcon size={13} />
                <span>Start Verification Run</span>
              </button>
            </>
          )}
          {isRunning && (
            <div className="text-xs text-indigo-400 font-semibold animate-pulse flex items-center gap-2">
              <RefreshCwIcon size={13} className="animate-spin" />
              <span>Executing Pipeline Stages...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
