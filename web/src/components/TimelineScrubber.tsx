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
    <div className="bg-[#111622] rounded-2xl border border-slate-800/80 p-4 shadow-xl flex flex-col gap-3">
      {/* Timeline Header */}
      <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
        <div className="flex items-center gap-2">
          <ActivityIcon size={14} className="text-indigo-400" />
          <span>Synchronized Multi-Track Scrubber</span>
        </div>
        <div className="text-[11px] text-slate-400 font-mono">
          Hover / Click any track to seek · Current: {currentTimestampMs}ms
        </div>
      </div>

      {/* Tracks Container */}
      <div
        ref={timelineRef}
        onClick={handleTimelineClick}
        className="relative bg-[#0b0e17] rounded-xl border border-slate-800 p-3 flex flex-col gap-3 cursor-pointer select-none overflow-hidden"
      >
        {/* Playhead Scrub Line */}
        <div
          className="absolute top-0 bottom-0 z-30 pointer-events-none transition-all flex flex-col items-center"
          style={{ left: `${progressPercent}%` }}
        >
          <div className="w-3 h-3 bg-indigo-500 rounded-full shadow-lg shadow-indigo-500/50 -mt-1 ring-2 ring-white" />
          <div className="w-0.5 flex-1 bg-indigo-500 shadow-sm" />
        </div>

        {/* Track 1: Time Ticks & Ruler */}
        <div className="relative h-6 border-b border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-500 px-1">
          <span>0.0s</span>
          <span>0.5s</span>
          <span>1.0s</span>
          <span>1.5s</span>
          <span>2.0s</span>
          <span>2.5s</span>
          <span>3.0s</span>
        </div>

        {/* Track 2: Anomalies Track */}
        <div className="flex items-center gap-2">
          <div className="w-24 flex items-center gap-1.5 text-[11px] font-medium text-rose-400 shrink-0">
            <AlertTriangleIcon size={13} />
            <span>Anomalies</span>
          </div>
          <div className="relative flex-1 h-7 bg-slate-900/60 rounded-lg border border-slate-800/70 overflow-hidden">
            {anomalies.map((anom, idx) => {
              const leftPercent = (anom.t_start_ms / totalDurationMs) * 100;
              const widthPercent = Math.max(
                4,
                ((anom.t_end_ms - anom.t_start_ms) / totalDurationMs) * 100
              );

              return (
                <div
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSeekMs(anom.t_start_ms);
                  }}
                  className="absolute top-1 bottom-1 bg-rose-500/80 hover:bg-rose-500 text-white text-[10px] font-bold px-2 rounded flex items-center gap-1 shadow-md shadow-rose-500/30 transition-transform hover:scale-105 z-10"
                  style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                  title={`${anom.type.toUpperCase()}: ${anom.details} (Click to jump)`}
                >
                  <span className="truncate">{anom.type}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Track 3: DOM Probe Mutations Track */}
        <div className="flex items-center gap-2">
          <div className="w-24 flex items-center gap-1.5 text-[11px] font-medium text-sky-400 shrink-0">
            <ActivityIcon size={13} />
            <span>DOM Probe</span>
          </div>
          <div className="relative flex-1 h-6 bg-slate-900/60 rounded-lg border border-slate-800/70 overflow-hidden flex items-center px-2">
            {/* Render probe mutation markers across the duration */}
            {session.frames.map((frame, i) => {
              if (i % 6 !== 0) return null; // sample ticks
              const pos = (frame.t_ms / totalDurationMs) * 100;
              return (
                <div
                  key={i}
                  className="absolute top-1.5 bottom-1.5 w-0.5 bg-sky-500/40 rounded-full"
                  style={{ left: `${pos}%` }}
                  title={`DOM frame ${frame.frame_index} (${frame.probe_elements.length} tracked elements)`}
                />
              );
            })}
          </div>
        </div>

        {/* Track 4: HAR Network Requests Track */}
        <div className="flex items-center gap-2">
          <div className="w-24 flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 shrink-0">
            <WifiIcon size={13} />
            <span>Network HAR</span>
          </div>
          <div className="relative flex-1 h-7 bg-slate-900/60 rounded-lg border border-slate-800/70 overflow-hidden">
            {harEntries.map((entry) => {
              const leftPercent = (entry.started_ms / totalDurationMs) * 100;
              const widthPercent = Math.max(
                6,
                (entry.duration_ms / totalDurationMs) * 100
              );

              return (
                <div
                  key={entry.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSeekMs(entry.started_ms);
                  }}
                  className={`absolute top-1 bottom-1 rounded px-2 text-[10px] font-semibold flex items-center gap-1 shadow-sm transition-transform hover:scale-105 z-10 ${
                    entry.duration_ms > 400
                      ? 'bg-amber-500/80 hover:bg-amber-500 text-slate-950'
                      : 'bg-emerald-500/70 hover:bg-emerald-500 text-white'
                  }`}
                  style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                  title={`${entry.method} ${entry.url} - ${entry.duration_ms}ms (Click to seek)`}
                >
                  <span className="font-mono text-[9px]">{entry.method}</span>
                  <span className="truncate">{entry.url.split('/').pop()}</span>
                  <span className="font-mono text-[9px] opacity-80">({entry.duration_ms}ms)</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
