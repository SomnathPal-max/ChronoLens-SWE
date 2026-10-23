import React from 'react';
import { LayersIcon, AlertTriangleIcon, ActivityIcon } from '../icons';
import { ProbeElement } from '../../types';

interface TelemetryTabProps {
  elements: ProbeElement[];
  currentTimestampMs: number;
}

export const TelemetryTab: React.FC<TelemetryTabProps> = ({
  elements,
  currentTimestampMs,
}) => {
  return (
    <div className="flex flex-col gap-4 text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
          <ActivityIcon size={14} className="text-sky-400" />
          <span>Active Frame DOM Telemetry ({currentTimestampMs}ms)</span>
        </div>
        <span className="text-slate-500 font-mono">
          {elements.length} tracked elements
        </span>
      </div>

      {elements.length === 0 ? (
        <div className="p-8 text-center text-slate-500 bg-[#141b2d] rounded-xl border border-slate-800">
          No active probe elements logged at this timestamp.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {elements.map((el) => {
            const hasStackingTrap =
              el.transform && el.transform.includes('translateZ');

            return (
              <div
                key={el.id}
                className={`bg-[#141b2d] rounded-xl border p-3 flex flex-col gap-2 transition-all ${
                  hasStackingTrap
                    ? 'border-amber-500/40 shadow-sm shadow-amber-500/10'
                    : 'border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-200">
                      {el.data_cl || el.id}
                    </span>
                    {el.tag && (
                      <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                        {el.tag}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      z-index: {el.zIndex}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                      op: {el.opacity}
                    </span>
                  </div>
                </div>

                {/* Stacking Context Warning Alert */}
                {hasStackingTrap && (
                  <div className="flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300 text-[11px]">
                    <AlertTriangleIcon size={14} className="shrink-0" />
                    <span>
                      <strong>Stacking Context Trap:</strong> Element declares{' '}
                      <code className="bg-amber-950/40 px-1 py-0.5 rounded">
                        {el.transform}
                      </code>
                      , isolating child z-index values from global layering.
                    </span>
                  </div>
                )}

                {/* Metrics Grid */}
                <div className="grid grid-cols-4 gap-2 pt-1 border-t border-slate-800/80 font-mono text-[11px] text-slate-400">
                  <div>
                    <span className="text-slate-500">x: </span>
                    <span className="text-slate-200">{Math.round(el.x)}px</span>
                  </div>
                  <div>
                    <span className="text-slate-500">y: </span>
                    <span className="text-slate-200">{Math.round(el.y)}px</span>
                  </div>
                  <div>
                    <span className="text-slate-500">w: </span>
                    <span className="text-slate-200">{Math.round(el.width)}px</span>
                  </div>
                  <div>
                    <span className="text-slate-500">h: </span>
                    <span className="text-slate-200">{Math.round(el.height)}px</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
