# Benchmark Results

## Seeded Bug Benchmark

| Bug | Anomaly Detected | Frame Accuracy | Reproduced | Correct File | Patch 5/5 |
|-----|-----------------|----------------|------------|--------------|-----------|
| 1 Race | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 2 Z-index | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 3 Clipping | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |

> Results will be filled in as phases are completed.

## Acceptance Criteria

- **P2**: Anomaly found within ±3 frames of ground truth. Zero anomalies on healthy baseline.
- **P3**: Signature match on ≥2/3 bugs. Root cause names correct file for ≥2/3.
- **P4**: Patched build passes 5/5 runs for ≥2/3 bugs. No new anomaly types.
