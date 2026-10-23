// ── Types ──────────────────────────────────────────────────────────────
export type ColumnId = 'todo' | 'inprogress' | 'done';

export interface CardData {
  id: string;
  title: string;
  description: string;
  column: ColumnId;
  priority: 'low' | 'medium' | 'high';
  assignee: string;
}

export interface ColumnData {
  id: ColumnId;
  title: string;
  dataCl: string;
}

export interface GroundTruthEntry {
  bug: number;
  type: string;
  timestamp: number;
  element: string;
  description: string;
}

declare global {
  interface Window {
    __chronolens_ground_truth: GroundTruthEntry[];
  }
}
