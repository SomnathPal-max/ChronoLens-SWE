import { ScrubberSession, ScrubberFrame, ProbeElement, SvgPathData } from '../types';

// Helper to generate frames for Bug 1 (Race snapback)
function generateBug1Frames(): ScrubberFrame[] {
  const frames: ScrubberFrame[] = [];
  const totalFrames = 90; // 3.0 seconds at 30 fps

  for (let i = 0; i < totalFrames; i++) {
    const t_ms = Math.round(i * 33.33);

    // Initial card position in column-todo: x=40, y=180
    // At t=1290 (frame 38) to t=1400: user drags card to column-inprogress (x=360, y=180)
    // At t=2085 (frame 62): card snaps back to column-todo (x=40, y=180) due to stale response!
    let cardX = 40;
    let cardCol = 'column-todo';

    if (t_ms >= 1350 && t_ms < 2085) {
      cardX = 360;
      cardCol = 'column-inprogress';
    } else if (t_ms >= 2085) {
      cardX = 40; // Snapback!
      cardCol = 'column-todo';
    }

    const probeElements: ProbeElement[] = [
      {
        id: 'navbar',
        data_cl: 'navbar',
        x: 0,
        y: 0,
        width: 1200,
        height: 64,
        zIndex: 1000,
        opacity: 1,
        visibility: 'visible',
        display: 'flex',
      },
      {
        id: 'column-todo',
        data_cl: 'column-todo',
        x: 20,
        y: 90,
        width: 320,
        height: 600,
        zIndex: 1,
        opacity: 1,
        visibility: 'visible',
        display: 'block',
      },
      {
        id: 'column-inprogress',
        data_cl: 'column-inprogress',
        x: 360,
        y: 90,
        width: 320,
        height: 600,
        zIndex: 1,
        opacity: 1,
        visibility: 'visible',
        display: 'block',
      },
      {
        id: 'column-done',
        data_cl: 'column-done',
        x: 700,
        y: 90,
        width: 320,
        height: 600,
        zIndex: 1,
        opacity: 1,
        visibility: 'visible',
        display: 'block',
      },
      {
        id: 'card-1',
        data_cl: 'card-1',
        tag: `Kanban Card (${cardCol})`,
        x: cardX,
        y: 180,
        width: 280,
        height: 90,
        zIndex: t_ms >= 1350 && t_ms <= 1450 ? 50 : 2,
        opacity: 1,
        visibility: 'visible',
        display: 'block',
      },
    ];

    const svg_paths: SvgPathData[] = [
      {
        concept: 'navbar',
        path: `M 0 0 L 1200 0 L 1200 64 L 0 64 Z`,
        color: '#6366f1',
        confidence: 0.98,
        bbox: [0, 0, 1200, 64],
      },
      {
        concept: 'kanban column (To Do)',
        path: `M 20 90 L 340 90 L 340 690 L 20 690 Z`,
        color: '#3b82f6',
        confidence: 0.94,
        bbox: [20, 90, 340, 690],
      },
      {
        concept: 'kanban column (In Progress)',
        path: `M 360 90 L 680 90 L 680 690 L 360 690 Z`,
        color: '#3b82f6',
        confidence: 0.94,
        bbox: [360, 90, 680, 690],
      },
      {
        concept: 'kanban card (Fix auth bug)',
        path: `M ${cardX} 180 L ${cardX + 280} 180 L ${cardX + 280} 270 L ${cardX} 270 Z`,
        color: t_ms >= 2050 && t_ms <= 2200 ? '#ef4444' : '#10b981',
        confidence: 0.96,
        bbox: [cardX, 180, cardX + 280, 270],
      },
    ];

    frames.push({
      frame_index: i,
      t_ms,
      svg_paths,
      probe_elements: probeElements,
      active_anomalies:
        t_ms >= 2000 && t_ms <= 2200
          ? [
              {
                type: 'teleport',
                concept: 'kanban card (Fix auth bug)',
                t_start_ms: 2050,
                t_end_ms: 2150,
                frame_index: 62,
                severity: 'critical',
                details: 'Centroid teleported 320px from In Progress back to To Do (snapback)',
                bbox: [40, 180, 320, 270],
              },
            ]
          : [],
    });
  }

  return frames;
}

// Helper to generate frames for Bug 2 (Z-Index modal overlap)
function generateBug2Frames(): ScrubberFrame[] {
  const frames: ScrubberFrame[] = [];
  const totalFrames = 90;

  for (let i = 0; i < totalFrames; i++) {
    const t_ms = Math.round(i * 33.33);

    // Modal opens at t=1000 (frame 30)
    const modalVisible = t_ms >= 1000;

    const probeElements: ProbeElement[] = [
      {
        id: 'navbar',
        data_cl: 'navbar',
        x: 0,
        y: 0,
        width: 800,
        height: 64,
        zIndex: 1000,
        opacity: 1,
        visibility: 'visible',
        display: 'flex',
      },
      {
        id: 'board-container',
        data_cl: 'kanban-board',
        x: 0,
        y: 64,
        width: 800,
        height: 700,
        zIndex: 1,
        opacity: 1,
        visibility: 'visible',
        display: 'flex',
        transform: 'translateZ(0px)', // Stacking context trap!
      },
    ];

    if (modalVisible) {
      probeElements.push({
        id: 'modal',
        data_cl: 'modal',
        tag: 'Card Detail Dialog',
        x: 180,
        y: 30, // Overlaps navbar from y=30 to y=64!
        width: 440,
        height: 380,
        zIndex: 9999, // Trapped inside board-container stacking context!
        opacity: 1,
        visibility: 'visible',
        display: 'block',
      });
    }

    const svg_paths: SvgPathData[] = [
      {
        concept: 'navbar',
        path: `M 0 0 L 800 0 L 800 64 L 0 64 Z`,
        color: '#6366f1',
        confidence: 0.99,
        bbox: [0, 0, 800, 64],
      },
    ];

    if (modalVisible) {
      svg_paths.push({
        concept: 'modal dialog',
        path: `M 180 30 L 620 30 L 620 410 L 180 410 Z`,
        color: t_ms >= 1000 ? '#f59e0b' : '#38bdf8',
        confidence: 0.95,
        bbox: [180, 30, 620, 410],
      });
    }

    frames.push({
      frame_index: i,
      t_ms,
      svg_paths,
      probe_elements: probeElements,
      active_anomalies:
        modalVisible && t_ms >= 1000 && t_ms <= 2200
          ? [
              {
                type: 'cross_concept_overlap',
                concept: 'modal dialog',
                t_start_ms: 1000,
                t_end_ms: 2200,
                frame_index: 30,
                severity: 'high',
                details:
                  'Modal dialog overlaps sticky navbar (34px overlap) while rendered underneath due to translateZ(0) stacking context trap.',
                bbox: [180, 30, 620, 64],
              },
            ]
          : [],
    });
  }

  return frames;
}

// Helper to generate frames for Bug 3 (Button clipping)
function generateBug3Frames(): ScrubberFrame[] {
  const frames: ScrubberFrame[] = [];
  const totalFrames = 90;

  for (let i = 0; i < totalFrames; i++) {
    const t_ms = Math.round(i * 33.33);

    const probeElements: ProbeElement[] = [
      {
        id: 'navbar',
        data_cl: 'navbar',
        x: 0,
        y: 0,
        width: 360,
        height: 64,
        zIndex: 1000,
        opacity: 1,
        visibility: 'visible',
        display: 'flex',
      },
      {
        id: 'add-card-btn',
        data_cl: 'add-card-btn',
        tag: 'Add New Card Button',
        x: 20,
        y: 500,
        width: 120, // Too narrow for "Add New Card" text!
        height: 38,
        zIndex: 2,
        opacity: 1,
        visibility: 'visible',
        display: 'flex',
      },
    ];

    const svg_paths: SvgPathData[] = [
      {
        concept: 'add card button',
        path: `M 20 500 L 140 500 L 140 538 L 20 538 Z`,
        color: '#ec4899',
        confidence: 0.94,
        bbox: [20, 500, 140, 538],
      },
    ];

    frames.push({
      frame_index: i,
      t_ms,
      svg_paths,
      probe_elements: probeElements,
      active_anomalies: [
        {
          type: 'clipping',
          concept: 'add card button',
          t_start_ms: 100,
          t_end_ms: 2800,
          frame_index: 10,
          severity: 'medium',
          details: 'Button text "Add New Card" clipped at 360px viewport width: width is clamped to 120px with overflow: hidden.',
          bbox: [20, 500, 140, 538],
        },
      ],
    });
  }

  return frames;
}

export const MOCK_SESSIONS: Record<string, ScrubberSession> = {
  'p4-bug1': {
    run_id: 'p4-bug1',
    bug_number: 1,
    bug_title: 'Race Condition Snapback',
    bug_type: 'Optimistic UI Race Condition',
    status: 'PASSED',
    duration_s: 3.0,
    fps: 30,
    frame_count: 90,
    video_url: '/runs-data/phase-1/test-p1-bug1/bug1.mp4',
    before_after_url: '/runs-data/phase-4/p4-bug1/before_after.png',
    anomalies: [
      {
        id: 'anom-1',
        type: 'teleport',
        concept: 'kanban card (Fix auth bug)',
        t_start_ms: 2050,
        t_end_ms: 2150,
        frame_index: 62,
        severity: 'critical',
        details: 'Card centroid teleported 320px from In Progress back to To Do column at t=2085ms.',
        bbox: [40, 180, 320, 270],
      },
    ],
    root_cause: {
      hypothesis:
        'Optimistic card move is overwritten by an asynchronous stale server response from /api/cards/:id/move with 800ms artificial latency.',
      confidence: 0.96,
      falsifiable_check:
        'Enforce monotonic request versioning (moveVersionRef) to ignore stale responses and preserve optimistic target column.',
      files: [
        {
          path: 'demo-app/src/hooks/useCards.ts',
          lines: '44-80',
          why: 'The move reducer accepts stale /api/cards/:id/move response without checking request version, reverting UI state.',
        },
      ],
      evidence: [
        {
          source: 'probe',
          ref: 'teleport anomaly at t=2085ms',
          t_ms: 2085,
          description: 'Centroid jumped from x=360 back to x=40',
        },
        {
          source: 'har',
          ref: 'POST /api/cards/card-1/move',
          t_ms: 1290,
          description: 'Initiated at t=1290ms, resolved with stale snapshot at t=2085ms (795ms latency)',
        },
      ],
    },
    patch: {
      branch: 'chronolens/fix-p4-bug1',
      rationale:
        'Enforced monotonic request version counter (`moveVersionRef.current`) and preserved targetColumn in state mapper to ignore stale asynchronous responses.',
      diff: `--- a/demo-app/src/hooks/useCards.ts
+++ b/demo-app/src/hooks/useCards.ts
@@ -44,38 +44,21 @@
-      if (cfg.bug1) {
-        // BUG 1 path: NO request versioning — blindly accept server response
-        try {
-          const res = await fetch(\`/api/cards/\${cardId}/move\`, {
-            method: 'POST',
-            headers: { 'Content-Type': 'application/json' },
-            body: JSON.stringify({ column: targetColumn }),
-          });
-          if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
-          const data: CardData[] = await res.json();
-          // Blindly overwrite state with server response (which is STALE)
-          setCards(data);
-        } catch (err) {
-          setError((err as Error).message);
-          fetchCards();
-        }
-      } else {
-        // Healthy path: use version counter to ignore stale responses
-        const version = ++moveVersionRef.current;
+      // Use monotonic version counter to ignore stale responses
+      const version = ++moveVersionRef.current;
+      try {
+        const res = await fetch(\`/api/cards/\${cardId}/move\`, {
+          method: 'POST',
+          headers: { 'Content-Type': 'application/json' },
+          body: JSON.stringify({ column: targetColumn }),
+        });
+        if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
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
+      }`,
      tests_pass: true,
      lint_pass: true,
    },
    verification: {
      passed: true,
      runs: 5,
      passes: 5,
      stability_score: '5/5 (100%)',
      median_shape_iou: 1.0,
      signature_absent_in_all: true,
      new_anomaly_types: [],
      run_details: [
        { run_index: 1, passed: true, sig_reappeared: false, new_anomaly_types: [], median_shape_iou: 1.0, functional_pass: true },
        { run_index: 2, passed: true, sig_reappeared: false, new_anomaly_types: [], median_shape_iou: 1.0, functional_pass: true },
        { run_index: 3, passed: true, sig_reappeared: false, new_anomaly_types: [], median_shape_iou: 1.0, functional_pass: true },
        { run_index: 4, passed: true, sig_reappeared: false, new_anomaly_types: [], median_shape_iou: 1.0, functional_pass: true },
        { run_index: 5, passed: true, sig_reappeared: false, new_anomaly_types: [], median_shape_iou: 1.0, functional_pass: true },
      ],
    },
    frames: generateBug1Frames(),
    har_entries: [
      {
        id: 'har-1',
        method: 'GET',
        url: 'http://localhost:5173/api/cards',
        status: 200,
        started_ms: 50,
        duration_ms: 12,
        response_body: '[{"id":"card-1","title":"Fix auth bug","column":"todo"}]',
      },
      {
        id: 'har-2',
        method: 'POST',
        url: 'http://localhost:5173/api/cards/card-1/move',
        status: 200,
        started_ms: 1290,
        duration_ms: 795,
        request_body: '{"column":"inprogress"}',
        response_body: '[{"id":"card-1","title":"Fix auth bug","column":"todo"}]', // Stale!
      },
    ],
    pull_request_md: `# Fix(kanban): Prevent optimistic card move race condition snapback

## Summary
- **Bug**: Card snaps back to previous column ~800ms after user drag due to unversioned optimistic state update receiving a stale server response.
- **Root Cause**: \`/api/cards/:id/move\` returns after artificial 800ms delay with stale state; reducer blindly replaces optimistic state.
- **Fix**: Implemented monotonic request version counter (\`moveVersionRef\`) and preserved \`targetColumn\` on response resolution.
- **Verification**: 5 of 5 verification runs passed (100% stability, median IoU 1.00, 0 new anomalies).`,
  },

  'p4-bug2': {
    run_id: 'p4-bug2',
    bug_number: 2,
    bug_title: 'Z-Index Modal Stacking Context Trap',
    bug_type: 'CSS Stacking Context Isolation',
    status: 'PASSED',
    duration_s: 3.0,
    fps: 30,
    frame_count: 90,
    video_url: '/runs-data/phase-1/test-p1-bug2/bug2.mp4',
    before_after_url: '/runs-data/phase-4/p4-bug2/before_after.png',
    anomalies: [
      {
        id: 'anom-2',
        type: 'cross_concept_overlap',
        concept: 'modal dialog',
        t_start_ms: 1000,
        t_end_ms: 2200,
        frame_index: 30,
        severity: 'high',
        details: 'Modal card (z-index 9999) rendered under sticky navbar (z-index 1000) due to stacking context trap from transform: translateZ(0).',
        bbox: [180, 30, 620, 64],
      },
    ],
    root_cause: {
      hypothesis:
        'Parent container `Board.tsx` contains `transform: translateZ(0)` which spawns a new stacking context, capping modal z-index below the sticky navbar.',
      confidence: 0.98,
      falsifiable_check: 'Remove `transform: translateZ(0)` or hoist modal to root portal.',
      files: [
        {
          path: 'demo-app/src/components/Board.tsx',
          lines: '18-24',
          why: 'CSS transform property forces browser compositing engine to create a local stacking context.',
        },
      ],
      evidence: [
        {
          source: 'probe',
          ref: 'overlap at t=1000ms',
          t_ms: 1000,
          description: 'Modal y=30 intersects navbar y=0..64',
        },
        {
          source: 'probe',
          ref: 'DOM style inspection',
          t_ms: 1000,
          description: 'board-container has style: transform: translateZ(0px)',
        },
      ],
    },
    patch: {
      branch: 'chronolens/fix-p4-bug2',
      rationale: 'Removed `transform: translateZ(0)` on board container to preserve global document stacking order.',
      diff: `--- a/demo-app/src/components/Board.tsx
+++ b/demo-app/src/components/Board.tsx
@@ -19,7 +19,7 @@
-    <div className="flex-1 p-6" style={cfg.bug2 ? { transform: 'translateZ(0)' } : undefined}>
+    <div className="flex-1 p-6">
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto">`,
      tests_pass: true,
      lint_pass: true,
    },
    verification: {
      passed: true,
      runs: 5,
      passes: 5,
      stability_score: '5/5 (100%)',
      median_shape_iou: 1.0,
      signature_absent_in_all: true,
      new_anomaly_types: [],
      run_details: [
        { run_index: 1, passed: true, sig_reappeared: false, new_anomaly_types: [], median_shape_iou: 1.0, functional_pass: true },
        { run_index: 2, passed: true, sig_reappeared: false, new_anomaly_types: [], median_shape_iou: 1.0, functional_pass: true },
        { run_index: 3, passed: true, sig_reappeared: false, new_anomaly_types: [], median_shape_iou: 1.0, functional_pass: true },
        { run_index: 4, passed: true, sig_reappeared: false, new_anomaly_types: [], median_shape_iou: 1.0, functional_pass: true },
        { run_index: 5, passed: true, sig_reappeared: false, new_anomaly_types: [], median_shape_iou: 1.0, functional_pass: true },
      ],
    },
    frames: generateBug2Frames(),
    har_entries: [],
    pull_request_md: `# Fix(board): Remove stacking context trap breaking modal dialog z-index

## Summary
- **Bug**: Modal dialog rendered underneath sticky navigation bar on viewports narrower than 900px.
- **Root Cause**: \`Board.tsx\` used \`transform: translateZ(0)\` creating an isolated stacking context.
- **Fix**: Removed hardware acceleration hack allowing standard stacking order.
- **Verification**: 5 of 5 runs passed (100% stability, median IoU 1.00, 0 new anomalies).`,
  },

  'p4-bug3': {
    run_id: 'p4-bug3',
    bug_number: 3,
    bug_title: 'Button Label Overflow Clipping',
    bug_type: 'Responsive Layout Text Truncation',
    status: 'PASSED',
    duration_s: 3.0,
    fps: 30,
    frame_count: 90,
    video_url: '/runs-data/phase-1/test-p1-bug3/bug3.mp4',
    before_after_url: '/runs-data/phase-4/p4-bug3/before_after.png',
    anomalies: [
      {
        id: 'anom-3',
        type: 'clipping',
        concept: 'add card button',
        t_start_ms: 100,
        t_end_ms: 2800,
        frame_index: 10,
        severity: 'medium',
        details: 'Button label "Add New Card" truncated at 360px viewport due to hardcoded 120px width and overflow: hidden.',
        bbox: [20, 500, 140, 538],
      },
    ],
    root_cause: {
      hypothesis: 'Fixed width button with nowrap text and overflow: hidden clips label on mobile viewports.',
      confidence: 0.95,
      falsifiable_check: 'Replace fixed width with full-width responsive flex container and ellipsis truncation.',
      files: [
        {
          path: 'demo-app/src/components/Column.tsx',
          lines: '52-58',
          why: 'Hardcoded style width: 120px restricts button rendering area.',
        },
      ],
      evidence: [
        {
          source: 'probe',
          ref: 'scrollWidth > clientWidth on add-card-btn',
          t_ms: 200,
          description: 'scrollWidth is 148px, clientWidth is 120px',
        },
      ],
    },
    patch: {
      branch: 'chronolens/fix-p4-bug3',
      rationale: 'Updated button width to w-full with proper text truncation and flex layout.',
      diff: `--- a/demo-app/src/components/Column.tsx
+++ b/demo-app/src/components/Column.tsx
@@ -52,7 +52,7 @@
-          style={cfg.bug3 ? { width: '120px', whiteSpace: 'nowrap', overflow: 'hidden' } : undefined}
+          className="w-full mt-3 py-2 px-3 text-sm font-medium text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-lg border border-dashed border-slate-700 hover:border-slate-600 transition-colors flex items-center justify-center gap-1.5"`,
      tests_pass: true,
      lint_pass: true,
    },
    verification: {
      passed: true,
      runs: 5,
      passes: 5,
      stability_score: '5/5 (100%)',
      median_shape_iou: 1.0,
      signature_absent_in_all: true,
      new_anomaly_types: [],
      run_details: [
        { run_index: 1, passed: true, sig_reappeared: false, new_anomaly_types: [], median_shape_iou: 1.0, functional_pass: true },
        { run_index: 2, passed: true, sig_reappeared: false, new_anomaly_types: [], median_shape_iou: 1.0, functional_pass: true },
        { run_index: 3, passed: true, sig_reappeared: false, new_anomaly_types: [], median_shape_iou: 1.0, functional_pass: true },
        { run_index: 4, passed: true, sig_reappeared: false, new_anomaly_types: [], median_shape_iou: 1.0, functional_pass: true },
        { run_index: 5, passed: true, sig_reappeared: false, new_anomaly_types: [], median_shape_iou: 1.0, functional_pass: true },
      ],
    },
    frames: generateBug3Frames(),
    har_entries: [],
    pull_request_md: `# Fix(column): Ensure responsive width for Add Card action button

## Summary
- **Bug**: "Add New Card" label clipped at 360px viewport.
- **Root Cause**: \`Column.tsx\` enforced a 120px width limit.
- **Fix**: Replaced with full-width responsive flex container.
- **Verification**: 5 of 5 runs passed (100% stability, median IoU 1.00, 0 new anomalies).`,
  },
};
