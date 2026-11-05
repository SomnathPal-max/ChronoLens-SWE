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
    <div className="flex flex-col gap-3 text-xs font-sans">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-ink-primary font-mono text-[11px] uppercase tracking-wider font-semibold">
          <WifiIcon size={13} className="text-emerald-400" />
          <span>HAR Network Capture ({entries.length} requests)</span>
        </div>
        <span className="text-ink-tertiary font-mono text-[11px]">
          T: {currentTimestampMs}ms
        </span>
      </div>

      {entries.length === 0 ? (
        <div className="p-8 text-center text-ink-tertiary bg-obsidian-panel rounded-lg border border-obsidian-subtle font-mono text-xs">
          No external network requests in this session (purely visual bug).
        </div>
      ) : (
        <div className="flex flex-col gap-2">
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
                className={`bg-obsidian-panel rounded-lg border p-3 flex flex-col gap-2 cursor-pointer transition-all ${
                  isActive
                    ? 'border-amber-brand/80 shadow-xs ring-1 ring-amber-brand/30'
                    : 'border-obsidian-subtle hover:border-obsidian-border'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                        entry.method === 'POST'
                          ? 'bg-amber-brand/15 text-amber-brand border border-amber-brand/30'
                          : 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40'
                      }`}
                    >
                      {entry.method}
                    </span>
                    <span className="font-mono text-ink-primary font-medium text-xs">
                      {entry.url}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 font-bold">
                      {entry.status}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded flex items-center gap-1 ${
                        isSlow
                          ? 'bg-rose-950/40 text-rose-300 border border-rose-800/40 font-bold'
                          : 'bg-obsidian-canvas text-ink-tertiary border border-obsidian-subtle'
                      }`}
                    >
                      <ClockIcon size={10} />
                      {entry.duration_ms}ms
                    </span>
                  </div>
                </div>

                {/* Timing bar */}
                <div className="text-[10px] text-ink-tertiary font-mono flex items-center justify-between pt-1 border-t border-obsidian-subtle">
                  <span>START: {entry.started_ms}ms</span>
                  <span>
                    END: {entry.started_ms + entry.duration_ms}ms
                  </span>
                  {isActive && (
                    <span className="text-amber-brand font-bold">
                      ● ACTIVE IN CURRENT FRAME
                    </span>
                  )}
                </div>

                {/* Expanded Payload Details */}
                {isExpanded && (
                  <div className="mt-1 pt-2 border-t border-obsidian-subtle flex flex-col gap-2 font-mono text-[11px] bg-obsidian-canvas p-2.5 rounded">
                    {entry.request_body && (
                      <div>
                        <span className="text-ink-tertiary uppercase text-[10px] font-semibold">Request Payload:</span>
                        <pre className="mt-1 p-2 rounded bg-obsidian-surface border border-obsidian-subtle text-ink-primary overflow-x-auto text-[10px]">
                          {typeof entry.request_body === 'string'
                            ? entry.request_body
                            : JSON.stringify(entry.request_body, null, 2)}
                        </pre>
                      </div>
                    )}
                    {entry.response_body && (
                      <div>
                        <span className="text-ink-tertiary uppercase text-[10px] font-semibold">Server Response:</span>
                        <pre className="mt-1 p-2 rounded bg-obsidian-surface border border-obsidian-subtle text-ink-secondary overflow-x-auto text-[10px]">
                          {typeof entry.response_body === 'string'
                            ? entry.response_body
                            : JSON.stringify(entry.response_body, null, 2)}
                        </pre>
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
