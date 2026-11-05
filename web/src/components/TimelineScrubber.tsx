import React, { useRef } from 'react';
import { AlertTriangleIcon, ActivityIcon, WifiIcon } from './icons';
import { ScrubberSession, Anomaly, HarEntry } from '../types';

interface TimelineScrubberProps {
  session: ScrubberSession;
  currentTimestampMs: number;
  onSeekMs: (ms: number) => void;
  anomalies: Anomaly[];
  harEntries: HarEntry[];
}

export const TimelineScrubber: React.FC<TimelineScrubberProps> = ({
  session,
  currentTimestampMs,
  onSeekMs,
  anomalies,
  harEntries,
}) => {
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const totalDurationMs = session.duration_s * 1000;

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeekMs(Math.round(ratio * totalDurationMs));
  };

  const progressPercent = Math.min(100, Math.max(0, (currentTimestampMs / totalDurationMs) * 100));

  return (
    <div className="bg-obsidian-surface rounded-xl border border-obsidian-subtle p-3.5 shadow-xl flex flex-col gap-2.5">
      {/* Timeline Header */}
      <div className="flex items-center justify-between text-xs font-medium text-ink-secondary">
        <div className="flex items-center gap-2">
          <ActivityIcon size={13} className="text-amber-brand" />
          <span className="font-mono text-xs uppercase tracking-wider text-ink-primary font-semibold">
            Telemetry Multi-Track
          </span>
        </div>
        <div className="text-[11px] text-ink-tertiary font-mono">
          SEEK: <span className="text-amber-brand font-bold">{Math.round(currentTimestampMs)}ms</span> / {totalDurationMs}ms
        </div>
      </div>

      {/* Tracks Container */}
      <div
        ref={timelineRef}
        onClick={handleTimelineClick}
        className="relative bg-obsidian-canvas rounded-lg border border-obsidian-subtle p-2.5 flex flex-col gap-2 cursor-pointer select-none overflow-hidden"
      >
        {/* Playhead Scrub Needle */}
        <div
          className="absolute top-0 bottom-0 z-30 pointer-events-none transition-all flex flex-col items-center"
          style={{ left: `${progressPercent}%` }}
        >
          <div className="w-2.5 h-2.5 bg-amber-brand rotate-45 shadow-sm -mt-1 ring-1 ring-obsidian-canvas" />
          <div className="w-[1.5px] flex-1 bg-amber-brand" />
        </div>

        {/* Track 1: Time Ticks & Ruler (Oscilloscope style) */}
        <div className="relative h-5 border-b border-obsidian-subtle flex items-center justify-between text-[10px] font-mono text-ink-tertiary px-1">
          <span>0.00s</span>
          <span>0.50s</span>
          <span>1.00s</span>
          <span>1.50s</span>
          <span>2.00s</span>
          <span>2.50s</span>
          <span>3.00s</span>
        </div>

        {/* Track 2: Anomalies Track */}
        <div className="flex items-center gap-2">
          <div className="w-24 flex items-center gap-1.5 text-[10px] font-mono font-medium text-rose-400 shrink-0 uppercase">
            <AlertTriangleIcon size={12} />
            <span>Anomalies</span>
          </div>
          <div className="relative flex-1 h-6 bg-obsidian-panel rounded border border-obsidian-subtle/80 overflow-hidden">
            {anomalies.map((anom, idx) => {
              const leftPercent = (anom.t_start_ms / totalDurationMs) * 100;
              const widthPercent = Math.max(
                5,
                ((anom.t_end_ms - anom.t_start_ms) / totalDurationMs) * 100
              );

              return (
                <div
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSeekMs(anom.t_start_ms);
                  }}
                  className="absolute top-0.5 bottom-0.5 bg-rose-500/90 hover:bg-rose-400 text-white text-[9px] font-mono font-bold px-1.5 rounded-sm flex items-center gap-1 shadow-sm transition-transform hover:scale-[1.02] z-10"
                  style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                  title={`${anom.type.toUpperCase()}: ${anom.details} (Click to jump)`}
                >
                  <span className="truncate uppercase">{anom.type}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Track 3: DOM Probe Mutations Track */}
        <div className="flex items-center gap-2">
          <div className="w-24 flex items-center gap-1.5 text-[10px] font-mono font-medium text-sky-400 shrink-0 uppercase">
            <ActivityIcon size={12} />
            <span>DOM Probe</span>
          </div>
          <div className="relative flex-1 h-5 bg-obsidian-panel rounded border border-obsidian-subtle/80 overflow-hidden flex items-center px-1">
            {/* Render probe mutation markers across the duration */}
            {session.frames.map((frame, i) => {
              if (i % 4 !== 0) return null; // sample ticks
              const pos = (frame.t_ms / totalDurationMs) * 100;
              return (
                <div
                  key={i}
                  className="absolute top-1 bottom-1 w-[1px] bg-sky-400/40"
                  style={{ left: `${pos}%` }}
                  title={`DOM frame ${frame.frame_index} (${frame.probe_elements.length} tracked elements)`}
                />
              );
            })}
          </div>
        </div>

        {/* Track 4: HAR Network Requests Track */}
        <div className="flex items-center gap-2">
          <div className="w-24 flex items-center gap-1.5 text-[10px] font-mono font-medium text-emerald-400 shrink-0 uppercase">
            <WifiIcon size={12} />
            <span>Network HAR</span>
          </div>
          <div className="relative flex-1 h-6 bg-obsidian-panel rounded border border-obsidian-subtle/80 overflow-hidden">
            {harEntries.map((entry) => {
              const leftPercent = (entry.started_ms / totalDurationMs) * 100;
              const widthPercent = Math.max(
                8,
                (entry.duration_ms / totalDurationMs) * 100
              );

              return (
                <div
                  key={entry.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSeekMs(entry.started_ms);
                  }}
                  className={`absolute top-0.5 bottom-0.5 rounded-sm px-1.5 text-[9px] font-mono font-semibold flex items-center gap-1 transition-transform hover:scale-[1.02] z-10 ${
                    entry.duration_ms > 400
                      ? 'bg-amber-brand text-obsidian-canvas'
                      : 'bg-emerald-600/80 hover:bg-emerald-500 text-white'
                  }`}
                  style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                  title={`${entry.method} ${entry.url} - ${entry.duration_ms}ms (Click to seek)`}
                >
                  <span>{entry.method}</span>
                  <span className="truncate">{entry.url.split('/').pop()}</span>
                  <span className="opacity-80">({entry.duration_ms}ms)</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
