import React, { useState } from 'react';
import {
  FileCodeIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  CopyIcon,
  LayersIcon,
} from '../icons';
import { RootCauseInfo, PatchInfo, VerificationInfo } from '../../types';

interface RootCauseTabProps {
  rootCause: RootCauseInfo;
  patch: PatchInfo;
  verification: VerificationInfo;
  beforeAfterUrl?: string;
}

export const RootCauseTab: React.FC<RootCauseTabProps> = ({
  rootCause,
  patch,
  verification,
}) => {
  const [copiedDiff, setCopiedDiff] = useState<boolean>(false);
  const [copiedBranch, setCopiedBranch] = useState<boolean>(false);

  const handleCopyDiff = () => {
    navigator.clipboard.writeText(patch.diff);
    setCopiedDiff(true);
    setTimeout(() => setCopiedDiff(false), 2000);
  };

  const handleCopyBranch = () => {
    navigator.clipboard.writeText(`git checkout ${patch.branch}`);
    setCopiedBranch(true);
    setTimeout(() => setCopiedBranch(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4 text-xs font-sans">
      {/* Root Cause Hypothesis Card */}
      <div className="bg-obsidian-panel rounded-lg border border-obsidian-subtle p-3.5 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-amber-brand font-mono font-semibold text-[11px] uppercase tracking-wider">
            <LayersIcon size={13} />
            <span>Muse Wonder 1.0 Root Cause Analysis</span>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
            CONFIDENCE: {Math.round(rootCause.confidence * 100)}%
          </span>
        </div>

        <p className="text-ink-primary font-medium leading-relaxed text-xs">
          {rootCause.hypothesis}
        </p>

        {/* Target Files Badge */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-obsidian-subtle">
          <span className="text-[11px] font-mono text-ink-tertiary">TARGET:</span>
          {rootCause.files.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-obsidian-canvas text-[11px] font-mono text-ink-primary border border-obsidian-subtle"
            >
              <FileCodeIcon size={11} className="text-amber-brand" />
              <span>{file.path}</span>
              <span className="text-ink-dim">({file.lines})</span>
            </div>
          ))}
        </div>

        {/* Falsifiable Check */}
        <div className="bg-obsidian-canvas rounded p-2.5 border border-obsidian-subtle/80 flex flex-col gap-1 font-mono text-[11px]">
          <span className="text-ink-tertiary uppercase text-[10px] font-semibold">Falsifiable Hypothesis Check:</span>
          <span className="text-ink-secondary">{rootCause.falsifiable_check}</span>
        </div>
      </div>

      {/* 5-Run Verification Card */}
      <div className="bg-obsidian-panel rounded-lg border border-obsidian-subtle p-3.5 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-emerald-400 font-mono font-semibold text-[11px] uppercase tracking-wider">
            <ShieldCheckIcon size={13} />
            <span>Rule 8 Multi-Run Verification Gate</span>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/50 text-emerald-300 border border-emerald-800/50">
            STABILITY: {verification.stability_score}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center font-mono">
          <div className="bg-obsidian-canvas p-2 rounded border border-obsidian-subtle">
            <div className="text-[10px] text-ink-tertiary mb-0.5">RUNS PASSED</div>
            <div className="text-sm font-bold text-emerald-400">
              {verification.passes} / {verification.runs}
            </div>
          </div>
          <div className="bg-obsidian-canvas p-2 rounded border border-obsidian-subtle">
            <div className="text-[10px] text-ink-tertiary mb-0.5">MEDIAN IoU</div>
            <div className="text-sm font-bold text-sky-400">
              {verification.median_shape_iou.toFixed(2)}
            </div>
          </div>
          <div className="bg-obsidian-canvas p-2 rounded border border-obsidian-subtle">
            <div className="text-[10px] text-ink-tertiary mb-0.5">SIGNATURE REAPPEARED</div>
            <div className="text-sm font-bold text-emerald-400">
              {verification.signature_absent_in_all ? '0 / 5' : 'REGRESSED'}
            </div>
          </div>
          <div className="bg-obsidian-canvas p-2 rounded border border-obsidian-subtle">
            <div className="text-[10px] text-ink-tertiary mb-0.5">NEW ANOMALIES</div>
            <div className="text-sm font-bold text-emerald-400">
              {verification.new_anomaly_types.length}
            </div>
          </div>
        </div>

        {/* 5-Run Visual Indicators */}
        <div className="flex items-center gap-1.5 pt-1">
          <span className="text-[10px] font-mono text-ink-tertiary mr-1">GATE RUNS:</span>
          {verification.run_details.map((run) => (
            <div
              key={run.run_index}
              className="flex-1 py-1 px-1.5 rounded bg-emerald-950/30 border border-emerald-800/40 text-emerald-400 text-[10px] font-mono font-semibold flex items-center justify-center gap-1"
            >
              <CheckCircleIcon size={11} />
              <span>RUN {run.run_index}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Synthesized Patch Unified Diff Viewer */}
      <div className="bg-obsidian-panel rounded-lg border border-obsidian-subtle overflow-hidden flex flex-col">
        <div className="px-3.5 py-2 bg-obsidian-elevated border-b border-obsidian-subtle flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCodeIcon size={13} className="text-amber-brand" />
            <span className="font-mono text-xs font-semibold text-ink-primary">Synthesized Worktree Patch</span>
            <span className="px-1.5 py-0.5 rounded bg-obsidian-canvas text-ink-secondary text-[10px] font-mono border border-obsidian-subtle">
              {patch.branch}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopyBranch}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-obsidian-canvas hover:bg-obsidian-subtle text-[10px] font-mono text-ink-secondary hover:text-ink-primary border border-obsidian-subtle transition-colors"
              title="Copy git checkout command"
            >
              <span>{copiedBranch ? 'Copied command!' : 'checkout branch'}</span>
            </button>

            <button
              onClick={handleCopyDiff}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-brand hover:bg-amber-hover text-[10px] font-semibold text-obsidian-canvas transition-colors"
            >
              <CopyIcon size={10} className="fill-current" />
              <span>{copiedDiff ? 'Copied!' : 'Copy Diff'}</span>
            </button>
          </div>
        </div>

        <p className="px-3.5 py-2 text-[11px] text-ink-secondary border-b border-obsidian-subtle bg-obsidian-panel/60">
          <span className="font-semibold text-ink-primary">Rationale: </span>
          {patch.rationale}
        </p>

        {/* GitHub Unified Diff View */}
        <div className="p-3 bg-obsidian-canvas overflow-x-auto font-mono text-[11px] leading-relaxed max-h-80">
          {patch.diff.split('\n').map((line, idx) => {
            let lineClass = 'text-ink-tertiary';
            let bgClass = '';

            if (line.startsWith('+++') || line.startsWith('---')) {
              lineClass = 'text-ink-primary font-bold';
            } else if (line.startsWith('@@')) {
              lineClass = 'text-amber-brand font-semibold';
              bgClass = 'bg-amber-brand/10';
            } else if (line.startsWith('+')) {
              lineClass = 'text-emerald-400';
              bgClass = 'bg-emerald-950/40';
            } else if (line.startsWith('-')) {
              lineClass = 'text-rose-400';
              bgClass = 'bg-rose-950/40';
            }

            return (
              <div key={idx} className={`${lineClass} ${bgClass} px-2 py-0.5 rounded-xs flex gap-2`}>
                <span className="w-6 text-right select-none opacity-40 text-[10px]">{idx + 1}</span>
                <span className="flex-1">{line || ' '}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
