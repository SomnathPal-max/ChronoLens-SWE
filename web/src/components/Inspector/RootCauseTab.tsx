import React, { useState } from 'react';
import {
  FileCodeIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
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
  beforeAfterUrl,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopyDiff = () => {
    navigator.clipboard.writeText(patch.diff);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6 text-sm">
      {/* Root Cause Hypothesis Card */}
      <div className="bg-[#141b2d] rounded-xl border border-slate-800 p-4 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs tracking-wider uppercase">
            <LayersIcon size={14} />
            <span>Muse Wonder 1.0 Root Cause Analysis</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Confidence: {Math.round(rootCause.confidence * 100)}%
          </span>
        </div>

        <p className="text-slate-100 font-medium leading-relaxed">{rootCause.hypothesis}</p>

        {/* Target Files Badge */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80">
          <span className="text-xs text-slate-400">Target File:</span>
          {rootCause.files.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-800/80 text-xs font-mono text-indigo-300 border border-slate-700/60"
            >
              <FileCodeIcon size={12} />
              <span>{file.path}</span>
              <span className="text-slate-500">({file.lines})</span>
            </div>
          ))}
        </div>

        {/* Falsifiable Check */}
        <div className="bg-[#0e1320] rounded-lg p-3 border border-slate-800/80 text-xs flex flex-col gap-1">
          <span className="text-slate-400 font-semibold">Falsifiable Verification Hypothesis:</span>
          <span className="text-slate-300 font-mono">{rootCause.falsifiable_check}</span>
        </div>
      </div>

      {/* 5-Run Verification Card */}
      <div className="bg-[#141b2d] rounded-xl border border-slate-800 p-4 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs tracking-wider uppercase">
            <ShieldCheckIcon size={14} />
            <span>Multi-Run Verification Gate</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Stability: {verification.stability_score}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <div className="bg-[#0e1320] p-2.5 rounded-lg border border-slate-800">
            <div className="text-[11px] text-slate-400 mb-0.5">Runs Passed</div>
            <div className="text-base font-bold text-emerald-400">
              {verification.passes} / {verification.runs}
            </div>
          </div>
          <div className="bg-[#0e1320] p-2.5 rounded-lg border border-slate-800">
            <div className="text-[11px] text-slate-400 mb-0.5">Median Shape IoU</div>
            <div className="text-base font-bold text-sky-400">
              {verification.median_shape_iou.toFixed(2)}
            </div>
          </div>
          <div className="bg-[#0e1320] p-2.5 rounded-lg border border-slate-800">
            <div className="text-[11px] text-slate-400 mb-0.5">Signature Reappeared</div>
            <div className="text-base font-bold text-emerald-400">
              {verification.signature_absent_in_all ? '0 / 5' : 'Yes'}
            </div>
          </div>
          <div className="bg-[#0e1320] p-2.5 rounded-lg border border-slate-800">
            <div className="text-[11px] text-slate-400 mb-0.5">New Anomaly Types</div>
            <div className="text-base font-bold text-emerald-400">
              {verification.new_anomaly_types.length}
            </div>
          </div>
        </div>

        {/* 5-Run Visual Indicators */}
        <div className="flex items-center gap-2 pt-1">
          <span className="text-xs text-slate-400 mr-1">Run Checks:</span>
          {verification.run_details.map((run) => (
            <div
              key={run.run_index}
              className="flex-1 py-1 px-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center justify-center gap-1"
            >
              <CheckCircleIcon size={12} />
              <span>Run {run.run_index}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Synthesized Patch Unified Diff Viewer */}
      <div className="bg-[#141b2d] rounded-xl border border-slate-800 shadow-sm flex flex-col overflow-hidden">
        <div className="px-4 py-2.5 bg-[#0f1422] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <FileCodeIcon size={14} className="text-indigo-400" />
            <span className="font-semibold text-slate-200">Synthesized Worktree Patch</span>
            <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 text-[10px] font-mono border border-indigo-500/20">
              {patch.branch}
            </span>
          </div>

          <button
            onClick={handleCopyDiff}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors"
          >
            <CopyIcon size={12} />
            <span>{copied ? 'Copied!' : 'Copy Diff'}</span>
          </button>
        </div>

        <p className="px-4 py-2.5 text-xs text-slate-300 border-b border-slate-800/80 bg-[#121828]">
          <span className="font-semibold text-slate-400">Rationale: </span>
          {patch.rationale}
        </p>

        {/* Unified Diff View */}
        <div className="p-4 bg-[#0a0d14] overflow-x-auto font-mono text-xs leading-relaxed max-h-96">
          {patch.diff.split('\n').map((line, idx) => {
            let lineClass = 'text-slate-400';
            let bgClass = '';

            if (line.startsWith('+++') || line.startsWith('---')) {
              lineClass = 'text-slate-200 font-bold';
            } else if (line.startsWith('@@')) {
              lineClass = 'text-purple-400 font-semibold';
              bgClass = 'bg-purple-950/20';
            } else if (line.startsWith('+')) {
              lineClass = 'text-emerald-400';
              bgClass = 'bg-emerald-950/30';
            } else if (line.startsWith('-')) {
              lineClass = 'text-rose-400';
              bgClass = 'bg-rose-950/30';
            }

            return (
              <div key={idx} className={`${lineClass} ${bgClass} px-2 py-0.5 rounded-sm`}>
                {line || ' '}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
