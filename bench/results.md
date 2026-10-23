# Benchmark Results

## Seeded Bug Benchmark

| Bug | Anomaly Detected | Frame Accuracy | Reproduced | Correct File | Patch 5/5 |
|-----|-----------------|----------------|------------|--------------|-----------|
| 1 Race | ✅ Yes (`teleport` / `dropout`) | ✅ Within ±3 frames | ✅ Signature Match (attempt 1) | ✅ `demo-app/src/hooks/useCards.ts` | ✅ 5/5 Pass (100% stability) |
| 2 Z-index | ✅ Yes (`cross_concept_overlap`) | ✅ Within ±3 frames | ✅ Signature Match (attempt 1) | ✅ `demo-app/src/components/Board.tsx` | ✅ 5/5 Pass (100% stability) |
| 3 Clipping | ✅ Yes (`clipping`) | ✅ Within ±3 frames | ✅ Signature Match (attempt 1) | ✅ `demo-app/src/components/Column.tsx` | ⬜ Tested in verify suite |

> Healthy baseline verification: 0 false positive anomalies detected on clean runs.

## Acceptance Criteria

- **P2**: Anomaly found within ±3 frames of ground truth. Zero anomalies on healthy baseline. (✅ Passed)
- **P3**: Signature match on ≥2/3 bugs. Root cause names correct file for ≥2/3. (✅ Passed 3/3)
- **P4**: Patched build passes 5/5 runs for ≥2/3 bugs. No new anomaly types. (✅ Passed 2/2 tested in benchmark: Bug 1 & Bug 2 5/5)
