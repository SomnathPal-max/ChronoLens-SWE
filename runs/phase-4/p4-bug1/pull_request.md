# ✅ fix(demo-app): resolve visual regression in Bug 1

## Summary
- **Branch**: `chronolens/fix-p4-bug1`
- **Automated Debugger**: [ChronoLens-SWE](https://github.com/chronolens-swe)
- **Verification Gate**: **5/5 (100%) Runs Passed**
- **Median Shape Stability IoU**: `1.000` (Threshold: $\ge 0.95$)
- **New Anomaly Types**: `0`

## Root Cause Analysis
**Hypothesis**:
> Optimistic card move is overwritten by an asynchronous stale server response

**Telemetry Citations**:
- **[probe]** `bug-1 telemetry` @ `500.0ms`

## Patch Details
**Rationale**:
Removed unversioned optimistic state overwrite; enforced monotonic request version counter (`moveVersionRef.current`) to drop delayed stale server responses.

<details>
<summary>Unified Diff</summary>

```diff
--- a/demo-app/src/hooks/useCards.ts
+++ b/demo-app/src/hooks/useCards.ts
@@ -44,39 +44,21 @@
-      if (cfg.bug1) {
-        // BUG 1 path: NO request versioning — blindly accept server response
-        try {
-          const res = await fetch(`/api/cards/${cardId}/move`, {
-            method: 'POST',
-            headers: { 'Content-Type': 'application/json' },
-            body: JSON.stringify({ column: targetColumn }),
-          });
-          if (!res.ok) throw new Error(`HTTP ${res.status}`);
-          const data: CardData[] = await res.json();
-          // Blindly overwrite state with server response (which is STALE)
-          setCards(data);
-        } catch (err) {
-          setError((err as Error).message);
-          // Revert on error
-          fetchCards();
-        }
-      } else {
-        // Healthy path: use version counter to ignore stale responses
-        const version = ++moveVersionRef.current;
-        try {
-          const res = await fetch(`/api/cards/${cardId}/move`, {
-            method: 'POST',
-            headers: { 'Content-Type': 'application/json' },
-            body: JSON.stringify({ column: targetColumn }),
-          });
-          if (!res.ok) throw new Error(`HTTP ${res.status}`);
-          const data: CardData[] = await res.json();
-          // Only apply if this is still the latest request
-          if (moveVersionRef.current === version) {
-            setCards(data);
-          }
-        } catch (err) {
-          if (moveVersionRef.current === version) {
-            setError((err as Error).message);
-            fetchCards();
-          }
-        }
-      }
+      // Use monotonic version counter to ignore stale responses
+      const version = ++moveVersionRef.current;
+      try {
+        const res = await fetch(`/api/cards/${cardId}/move`, {
+          method: 'POST',
+          headers: { 'Content-Type': 'application/json' },
+          body: JSON.stringify({ column: targetColumn }),
+        });
+        if (!res.ok) throw new Error(`HTTP ${res.status}`);
+        const data: CardData[] = await res.json();
+        // Drop stale responses if a newer move occurred
+        if (moveVersionRef.current === version) {
+          setCards(
+            data.map((c) => (c.id === cardId ? { ...c, column: targetColumn } : c))
+          );
+        }
+      } catch (err) {
+        if (moveVersionRef.current === version) {
+          setError((err as Error).message);
+          fetchCards();
+        }
+      }

```
</details>

## Multi-Run Quantitative Verification (5/5 Gate)
| Verification Run | Status | Shape IoU | Ground Truth |
| :--- | :--- | :--- | :--- |
| Run 1 | ✅ Pass | IoU: 1.00 | Ground Truth Violations: 0 |
| Run 2 | ✅ Pass | IoU: 1.00 | Ground Truth Violations: 0 |
| Run 3 | ✅ Pass | IoU: 1.00 | Ground Truth Violations: 0 |
| Run 4 | ✅ Pass | IoU: 1.00 | Ground Truth Violations: 0 |
| Run 5 | ✅ Pass | IoU: 1.00 | Ground Truth Violations: 0 |

> **Quantitative Stability Verification**: The patch passed 5 of 5 headless Playwright verification runs with zero regressions and absent anomaly signature.
