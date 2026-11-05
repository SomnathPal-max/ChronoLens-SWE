import React from 'react';
import { AlertTriangleIcon, ClockIcon, PlayIcon } from '../icons';
import { Anomaly } from '../../types';

interface AnomaliesTabProps {
  anomalies: Anomaly[];
  currentTimestampMs: number;
  onSeekMs: (ms: number) => void;
}

export const AnomaliesTab: React.FC<AnomaliesTabProps> = ({
  anomalies,
  currentTimestampMs,
  onSeekMs,
}) => {
  return (
    <div className="flex flex-col gap-3 text-xs font-sans">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-ink-primary font-mono text-[11px] uppercase tracking-wider font-semibold">
          <AlertTriangleIcon size={13} className="text-rose-400" />
          <span>Detected Visual Regression Anomalies ({anomalies.length})</span>
        </div>
        <span className="text-ink-tertiary font-mono text-[11px]">
          THRESHOLDS: IoU &ge; 0.85 · TELEPORT &gt; 40px
        </span>
      </div>

      {anomalies.length === 0 ? (
        <div className="p-8 text-center text-ink-tertiary bg-obsidian-panel rounded-lg border border-obsidian-subtle font-mono text-xs">
          No anomalies detected! Visual state verified clean.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {anomalies.map((anom, idx) => {
            const isInside =
              currentTimestampMs >= anom.t_start_ms &&
              currentTimestampMs <= anom.t_end_ms;

            return (
              <div
                key={idx}
                className={`bg-obsidian-panel rounded-lg border p-3 flex flex-col gap-2 transition-all ${
                  isInside
                    ? 'border-rose-500/80 shadow-xs ring-1 ring-rose-500/30'
                    : 'border-obsidian-subtle hover:border-obsidian-border'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-rose-950/40 text-rose-300 border border-rose-800/40">
                      {anom.type}
                    </span>
                    <span className="font-mono font-semibold text-ink-primary text-xs">
                      {anom.concept}
                    </span>
                  </div>

                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-rose-600 text-white">
                    {anom.severity}
                  </span>
                </div>

                <p className="text-ink-secondary text-xs leading-relaxed">{anom.details}</p>

                <div className="flex items-center justify-between pt-1.5 border-t border-obsidian-subtle font-mono text-[11px] text-ink-tertiary">
                  <div className="flex items-center gap-1.5">
                    <ClockIcon size={11} />
                    <span>
                      {anom.t_start_ms}ms – {anom.t_end_ms}ms (FRAME {anom.frame_index})
                    </span>
                  </div>

                  <button
                    onClick={() => onSeekMs(anom.t_start_ms)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-brand hover:bg-amber-hover text-obsidian-canvas font-mono font-semibold text-[10px] transition-colors"
                  >
                    <PlayIcon size={10} className="fill-current" />
                    <span>SEEK TO FRAME</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
