export interface SvgPathData {
  concept: string;
  path: string;
  color: string;
  confidence: number;
  bbox?: [number, number, number, number]; // [x1, y1, x2, y2]
}

export interface ProbeElement {
  id: string;
  data_cl?: string;
  tag?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: string | number;
  opacity: string | number;
  visibility: string;
  display: string;
  transform?: string;
}

export interface ProbeEvent {
  t_ms: number;
  type?: string;
  elements: ProbeElement[];
}

export interface HarEntry {
  id: string;
  method: string;
  url: string;
  status: number;
  started_ms: number;
  duration_ms: number;
  request_body?: string;
  response_body?: string;
}

export interface EvidenceRef {
  source: 'probe' | 'har' | 'console' | 'video';
  ref: string;
  t_ms: number;
  description?: string;
}

export interface Anomaly {
  id?: string;
  type:
    | 'dropout'
    | 'instance_flicker'
    | 'teleport'
    | 'shape_stability'
    | 'occlusion_ratio'
    | 'cross_concept_overlap'
    | 'clipping';
  concept: string;
  t_start_ms: number;
  t_end_ms: number;
  frame_index: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: string;
  bbox?: [number, number, number, number];
}

export interface RootCauseInfo {
  hypothesis: string;
  confidence: number;
  falsifiable_check: string;
  files: Array<{
    path: string;
    lines: string;
    why: string;
  }>;
  evidence: EvidenceRef[];
}

export interface PatchInfo {
  branch: string;
  rationale: string;
  diff: string;
  tests_pass: boolean;
  lint_pass: boolean;
}

export interface VerificationRunDetail {
  run_index: number;
  passed: boolean;
  sig_reappeared: boolean;
  new_anomaly_types: string[];
  median_shape_iou: number;
  functional_pass: boolean;
  anomalies_count?: number;
}

export interface VerificationInfo {
  passed: boolean;
  runs: number;
  passes: number;
  stability_score: string;
  median_shape_iou: number;
  signature_absent_in_all: boolean;
  new_anomaly_types: string[];
  run_details: VerificationRunDetail[];
}

export interface ScrubberFrame {
  frame_index: number;
  t_ms: number;
  svg_paths: SvgPathData[];
  probe_elements: ProbeElement[];
  active_anomalies: Anomaly[];
}

export interface ScrubberSession {
  run_id: string;
  bug_number: number;
  bug_title: string;
  bug_type: string;
  status: 'PASSED' | 'FAILED' | 'RUNNING';
  duration_s: number;
  fps: number;
  frame_count: number;
  video_url?: string;
  before_after_url?: string;
  anomalies: Anomaly[];
  root_cause: RootCauseInfo;
  patch: PatchInfo;
  verification: VerificationInfo;
  frames: ScrubberFrame[];
  har_entries: HarEntry[];
  pull_request_md: string;
}

export interface PipelineStageEvent {
  stage: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  message: string;
  timestamp: string;
  details?: Record<string, any>;
}
