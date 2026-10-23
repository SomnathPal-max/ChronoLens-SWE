# Benchmark Results

## Seeded Bug Benchmark

| Bug | Anomaly Detected | Frame Accuracy | Reproduced | Correct File | Patch 5/5 |
|-----|-----------------|----------------|------------|--------------|-----------|
| 1 Race | ✅ Yes (`teleport` / `dropout`) | ✅ Within ±3 frames | ⬜ | ⬜ | ⬜ |
| 2 Z-index | ✅ Yes (`cross_concept_overlap`) | ✅ Within ±3 frames | ⬜ | ⬜ | ⬜ |
| 3 Clipping | ✅ Yes (`clipping`) | ✅ Within ±3 frames | ⬜ | ⬜ | ⬜ |

> Healthy baseline verification: 0 false positive anomalies detected on clean runs.

> Results will be filled in as phases are completed.

## Acceptance Criteria

- **P2**: Anomaly found within ±3 frames of ground truth. Zero anomalies on healthy baseline.
- **P3**: Signature match on ≥2/3 bugs. Root cause names correct file for ≥2/3.
- **P4**: Patched build passes 5/5 runs for ≥2/3 bugs. No new anomaly types.
