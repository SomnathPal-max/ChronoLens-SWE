import React from 'react';
import { AlertTriangleIcon, ActivityIcon } from '../icons';
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
    <div className="flex flex-col gap-3 text-xs font-sans">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-ink-primary font-mono text-[11px] uppercase tracking-wider font-semibold">
          <ActivityIcon size={13} className="text-sky-400" />
          <span>Active Frame DOM Telemetry ({currentTimestampMs}ms)</span>
        </div>
        <span className="text-ink-tertiary font-mono text-[11px]">
          {elements.length} TRACKED ELEMENTS
        </span>
      </div>

      {elements.length === 0 ? (
        <div className="p-8 text-center text-ink-tertiary bg-obsidian-panel rounded-lg border border-obsidian-subtle font-mono text-xs">
          No active probe elements logged at this timestamp.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {elements.map((el) => {
            const hasStackingTrap =
              el.transform && el.transform.includes('translateZ');

            return (
              <div
                key={el.id}
                className={`bg-obsidian-panel rounded-lg border p-3 flex flex-col gap-2 transition-all ${
                  hasStackingTrap
                    ? 'border-amber-brand/50 shadow-xs'
                    : 'border-obsidian-subtle'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-ink-primary text-xs">
                      {el.data_cl || el.id}
                    </span>
                    {el.tag && (
                      <span className="text-[10px] font-mono text-ink-secondary bg-obsidian-canvas border border-obsidian-subtle px-1.5 py-0.5 rounded">
                        &lt;{el.tag}&gt;
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 font-mono text-[10px]">
                    <span className="px-1.5 py-0.5 rounded font-semibold bg-obsidian-canvas text-sky-400 border border-obsidian-subtle">
                      Z: {el.zIndex}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-obsidian-canvas text-ink-tertiary border border-obsidian-subtle">
                      OP: {el.opacity}
                    </span>
                  </div>
                </div>

                {/* Stacking Context Warning Alert */}
                {hasStackingTrap && (
                  <div className="flex items-center gap-2 p-2 bg-amber-950/40 border border-amber-800/50 rounded text-amber-300 text-[11px] font-mono">
                    <AlertTriangleIcon size={13} className="shrink-0 text-amber-brand" />
                    <span>
                      <strong>STACKING CONTEXT TRAP:</strong> Declares{' '}
                      <code className="bg-obsidian-canvas px-1 py-0.5 rounded text-amber-brand border border-amber-brand/30">
                        {el.transform}
                      </code>
                      , isolating child z-index values from global layering.
                    </span>
                  </div>
                )}

                {/* Metrics Grid */}
                <div className="grid grid-cols-4 gap-2 pt-1 border-t border-obsidian-subtle font-mono text-[11px] text-ink-secondary">
                  <div>
                    <span className="text-ink-tertiary">X: </span>
                    <span className="text-ink-primary">{Math.round(el.x)}px</span>
                  </div>
                  <div>
                    <span className="text-ink-tertiary">Y: </span>
                    <span className="text-ink-primary">{Math.round(el.y)}px</span>
                  </div>
                  <div>
                    <span className="text-ink-tertiary">W: </span>
                    <span className="text-ink-primary">{Math.round(el.width)}px</span>
                  </div>
                  <div>
                    <span className="text-ink-tertiary">H: </span>
                    <span className="text-ink-primary">{Math.round(el.height)}px</span>
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
