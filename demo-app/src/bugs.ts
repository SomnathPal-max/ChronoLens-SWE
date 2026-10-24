// ── Bug configuration and activation logic ─────────────────────────────
import type { GroundTruthEntry } from './types';

export interface BugConfig {
  bug1: boolean; // race-condition snapback
  bug2: boolean; // z-index stacking context
  bug3: boolean; // clipping / overflow
}

let _configOverrides: Partial<BugConfig> | null = null;

/** Read ?bug= param(s) from the URL and merge with runtime overrides */
export function readBugConfig(): BugConfig {
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const bugValues = params.getAll('bug');
  const base = {
    bug1: bugValues.includes('1'),
    bug2: bugValues.includes('2'),
    bug3: bugValues.includes('3'),
  };

  if (_configOverrides) {
    return { ...base, ..._configOverrides };
  }
  return base;
}

export function setBugOverride(overrides: Partial<BugConfig> | null): BugConfig {
  _configOverrides = overrides;
  _config = readBugConfig();
  return _config;
}

/** Ensure the global ground-truth array exists */
export function initGroundTruth(): void {
  if (typeof window !== 'undefined' && !window.__chronolens_ground_truth) {
    window.__chronolens_ground_truth = [];
  }
}

/** Push a ground truth entry */
export function recordGroundTruth(entry: Omit<GroundTruthEntry, 'timestamp'>): void {
  initGroundTruth();
  if (typeof window !== 'undefined') {
    window.__chronolens_ground_truth.push({
      ...entry,
      timestamp: performance.now(),
    });
  }
}

// Cached config
let _config: BugConfig | null = null;

export function getBugConfig(): BugConfig {
  if (!_config) {
    _config = readBugConfig();
  }
  return _config;
}
