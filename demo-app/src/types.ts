// ── Types ──────────────────────────────────────────────────────────────
export type ColumnId = 'todo' | 'inprogress' | 'done';
export type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface ActivityItem {
  id: string;
  user: string;
  action: string;
  timestamp: string;
}

export interface CardData {
  id: string;
  key?: string; // e.g. "ENG-101"
  title: string;
  description: string;
  column: ColumnId;
  priority: PriorityLevel;
  assignee: string;
  avatar?: string;
  tags?: string[];
  dueDate?: string;
  subtasks?: Subtask[];
  commentsCount?: number;
  storyPoints?: number;
  activities?: ActivityItem[];
}

export interface ColumnData {
  id: ColumnId;
  title: string;
  dataCl: string;
  badgeColor: string;
}

export interface FilterOptions {
  search: string;
  priority: PriorityLevel | 'all';
  assignee: string | 'all';
  tag: string | 'all';
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
