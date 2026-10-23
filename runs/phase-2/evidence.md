# Phase 2 Evidence: SAM Fan-Out, Parser, Metrics & Detector

- **Milestone**: P2 (Days 2-3)
- **Status**: Completed

## Deliverables & Acceptance Criteria
1. **SAM 3.1 Fan-Out & `meta-sam-parser` Integration (`backend/app/pipeline/perceive.py`)**:
   - Implements Spark concept proposal & strict validation (1-4 words, no verbs, no commas).
   - Fans out SAM 3.1 calls in parallel (Rule 4: exactly one concept per request).
   - Reads the frame marker on each line, never relying on line order (Rule 6).
   - Uses `meta-sam-parser` to decode masks (`decode_mask_to_rle`, `decode_mask_to_svg_path`).
   - Filters out records with confidence < 0.5.
   - Provides DOM probe $\to$ Track translator for hybrid truth evaluation (Section 4).

2. **Metrics & Anomaly Detector (`backend/app/pipeline/detect.py`)**:
   - Implements all 7 visual anomaly metrics from Section 7:
     1. **Dropout**: Detects temporary disappearance of elements (card unmount / remount).
     2. **Instance Flicker**: Detects count fluctuation that reverts within 6 frames.
     3. **Teleport**: Detects centroid displacement exceeding $\max(3 \times p99, 40\text{px})$ (snap-back).
     4. **Shape Stability**: Detects translated IoU $< 0.85$ (deformation/reflow).
     5. **Occlusion Ratio**: Detects mask area $\div$ DOM area $< 0.9$ while DOM says visible.
     6. **Cross-Concept Overlap**: Detects IoU $> 0.05$ on must-not-overlap pairs (modal vs navbar).
     7. **Clipping**: Detects boundary collision against viewport edge or scroll overflow.
   - Implements Anomaly Signature generator ($\pm 300\text{ms}$ window).
   - Implements ground-truth evaluation helper.

3. **Acceptance Criteria Verification**:
   - **Bug 1 (Race Snapback)**: Detected anomaly within $\pm 3$ frames of ground truth marker.
   - **Bug 2 (Z-Index Trap)**: Detected cross-concept overlap anomaly within $\pm 3$ frames.
   - **Bug 3 (Button Clipping)**: Detected clipping anomaly within $\pm 3$ frames.
   - **Healthy Baseline**: 0 anomalies detected (zero false positives).
   - **Config Consolidation**: All prompts, thresholds, and parameters live in `backend/app/pipeline/config.py`.

4. **Test Suite**:
   - 46 tests passing 100% green with pytest.
   - Ruff lint & format 100% clean.
