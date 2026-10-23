import React, { useState } from 'react';
import { WifiIcon, ClockIcon } from '../icons';
import { HarEntry } from '../../types';

interface NetworkTabProps {
  entries: HarEntry[];
  currentTimestampMs: number;
}

export const NetworkTab: React.FC<NetworkTabProps> = ({
  entries,
  currentTimestampMs,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4 text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
          <WifiIcon size={14} className="text-emerald-400" />
          <span>HAR Network Capture ({entries.length} requests)</span>
        </div>
        <span className="text-slate-500 font-mono">
          Current time: {currentTimestampMs}ms
        </span>
      </div>

      {entries.length === 0 ? (
        <div className="p-8 text-center text-slate-500 bg-[#141b2d] rounded-xl border border-slate-800">
          No external network requests in this session (purely visual bug).
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {entries.map((entry) => {
            const isActive =
              currentTimestampMs >= entry.started_ms &&
              currentTimestampMs <= entry.started_ms + entry.duration_ms;
            const isSlow = entry.duration_ms > 400;
            const isExpanded = expandedId === entry.id;

            return (
              <div
                key={entry.id}
                onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                className={`bg-[#141b2d] rounded-xl border p-3 flex flex-col gap-2 cursor-pointer transition-all ${
                  isActive
                    ? 'border-indigo-500 shadow-md shadow-indigo-500/10 ring-1 ring-indigo-500/50'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        entry.method === 'POST'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {entry.method}
                    </span>
                    <span className="font-mono text-slate-200 font-medium">
                      {entry.url}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 font-mono">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                      {entry.status}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 ${
                        isSlow
                          ? 'bg-rose-500/20 text-rose-300 font-bold'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      <ClockIcon size={10} />
                      {entry.duration_ms}ms
                    </span>
                  </div>
                </div>

                {/* Timing bar */}
                <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between pt-1 border-t border-slate-800/80">
                  <span>Started: {entry.started_ms}ms</span>
                  <span>
                    Ended: {entry.started_ms + entry.duration_ms}ms
                  </span>
                  {isActive && (
                    <span className="text-indigo-400 font-bold animate-pulse">
                      ● Active at scrubber position
                    </span>
                  )}
                </div>

                {/* Expanded Payload Details */}
                {isExpanded && (
                  <div className="mt-2 pt-2 border-t border-slate-800 flex flex-col gap-2 font-mono text-[11px]">
                    {entry.request_body && (
                      <div className="bg-[#0b0e17] p-2.5 rounded-lg border border-slate-800">
                        <div className="text-slate-400 text-[10px] mb-1 font-sans font-semibold">
                          Request Payload:
                        </div>
                        <div className="text-slate-200 whitespace-pre-wrap">
                          {entry.request_body}
                        </div>
                      </div>
                    )}
                    {entry.response_body && (
                      <div className="bg-[#0b0e17] p-2.5 rounded-lg border border-slate-800">
                        <div className="text-amber-400 text-[10px] mb-1 font-sans font-semibold">
                          Response Payload (Stale State):
                        </div>
                        <div className="text-slate-200 whitespace-pre-wrap">
                          {entry.response_body}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
