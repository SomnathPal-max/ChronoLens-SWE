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
    <div className="flex flex-col gap-4 text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
          <AlertTriangleIcon size={14} className="text-rose-400" />
          <span>Detected Visual Regression Anomalies ({anomalies.length})</span>
        </div>
        <span className="text-slate-500 font-mono">
          Thresholds: IoU &ge; 0.85 · Teleport &gt; 40px
        </span>
      </div>

      {anomalies.length === 0 ? (
        <div className="p-8 text-center text-slate-500 bg-[#141b2d] rounded-xl border border-slate-800">
          No anomalies detected! Visual state verified clean.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {anomalies.map((anom, idx) => {
            const isInside =
              currentTimestampMs >= anom.t_start_ms &&
              currentTimestampMs <= anom.t_end_ms;

            return (
              <div
                key={idx}
                className={`bg-[#141b2d] rounded-xl border p-4 flex flex-col gap-2.5 transition-all ${
                  isInside
                    ? 'border-rose-500 shadow-lg shadow-rose-500/10 ring-1 ring-rose-500/50'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {anom.type}
                    </span>
                    <span className="font-semibold text-slate-200">
                      {anom.concept}
                    </span>
                  </div>

                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-600 text-white">
                    {anom.severity}
                  </span>
                </div>

                <p className="text-slate-300 leading-relaxed">{anom.details}</p>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 font-mono text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <ClockIcon size={12} />
                    <span>
                      Window: {anom.t_start_ms}ms – {anom.t_end_ms}ms (Frame {anom.frame_index})
                    </span>
                  </div>

                  <button
                    onClick={() => onSeekMs(anom.t_start_ms)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 font-sans font-semibold text-xs transition-colors"
                  >
                    <PlayIcon size={11} />
                    <span>Jump to Timestamp</span>
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
