// ── Bug configuration and activation logic ─────────────────────────────
import type { GroundTruthEntry } from './types';

export interface BugConfig {
  bug1: boolean; // race-condition snapback
  bug2: boolean; // z-index stacking context
  bug3: boolean; // clipping / overflow
}

/** Read ?bug= param(s) from the URL and return active bug config */
export function readBugConfig(): BugConfig {
  const params = new URLSearchParams(window.location.search);
  const bugValues = params.getAll('bug');
  return {
    bug1: bugValues.includes('1'),
    bug2: bugValues.includes('2'),
    bug3: bugValues.includes('3'),
  };
}

/** Ensure the global ground-truth array exists */
export function initGroundTruth(): void {
  if (!window.__chronolens_ground_truth) {
    window.__chronolens_ground_truth = [];
  }
}

/** Push a ground truth entry */
export function recordGroundTruth(entry: Omit<GroundTruthEntry, 'timestamp'>): void {
  initGroundTruth();
  window.__chronolens_ground_truth.push({
    ...entry,
    timestamp: performance.now(),
  });
}

// Singleton config
let _config: BugConfig | null = null;

export function getBugConfig(): BugConfig {
  if (!_config) {
    _config = readBugConfig();
  }
  return _config;
}
