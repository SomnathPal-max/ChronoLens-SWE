// ── Modal component ─────────────────────────────────────────────────
import React, { useEffect, useRef, useState } from 'react';
import type { CardData, PriorityLevel, Subtask } from '../types';
import { XIcon, FlameIcon, CalendarIcon, ListTodoIcon } from './icons';

interface ModalProps {
  card: CardData | null;
  onClose: () => void;
  onToggleSubtask?: (cardId: string, subtaskId: string) => void;
}

const priorityConfig: Record<PriorityLevel, { label: string; badge: string; iconColor: string }> = {
  urgent: { label: 'Urgent', badge: 'bg-rose-950/70 text-rose-200 border-rose-700/60', iconColor: 'text-rose-400' },
  high: { label: 'High', badge: 'bg-amber-950/70 text-amber-200 border-amber-700/60', iconColor: 'text-amber-400' },
  medium: { label: 'Medium', badge: 'bg-midnight-900 text-midnight-glow border-midnight-600/70', iconColor: 'text-midnight-glow' },
  low: { label: 'Low', badge: 'bg-emerald-950/70 text-emerald-200 border-emerald-700/60', iconColor: 'text-emerald-400' },
};

export const Modal: React.FC<ModalProps> = ({ card, onClose }) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'activity'>('details');
  const [localSubtasks, setLocalSubtasks] = useState<Subtask[]>([]);
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    if (card && card.subtasks) {
      setLocalSubtasks(card.subtasks);
    } else {
      setLocalSubtasks([
        { id: 'st-1', title: 'Technical review and specification', completed: true },
        { id: 'st-2', title: 'Implementation and unit tests', completed: false },
        { id: 'st-3', title: 'E2E regression verification', completed: false },
      ]);
    }
  }, [card]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!card) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const toggleSubtask = (stId: string) => {
    setLocalSubtasks((prev) =>
      prev.map((st) => (st.id === stId ? { ...st, completed: !st.completed } : st))
    );
  };

  const pConfig = priorityConfig[card.priority] || priorityConfig.medium;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto"
      style={{ zIndex: 9999 }}
      onClick={handleOverlayClick}
    >
      <div
        data-cl="modal"
        className="bg-midnight-900 border border-midnight-600 rounded-2xl shadow-2xl max-w-xl w-full p-6 relative text-vanilla-100 my-8 shadow-[0_20px_50px_rgba(11,13,27,0.85)]"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-vanilla-dim hover:text-vanilla-50 p-1 rounded-lg hover:bg-midnight-800 transition-colors"
          aria-label="Close modal"
        >
          <XIcon size={18} />
        </button>

        {/* Issue Header */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-mono font-bold text-midnight-glow bg-midnight-950 px-2 py-0.5 rounded border border-midnight-indigo/50">
            {card.key || card.id.toUpperCase()}
          </span>
          <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${pConfig.badge}`}>
            {card.priority === 'urgent' && <FlameIcon size={11} className={pConfig.iconColor} />}
            <span>{pConfig.label}</span>
          </span>
          <span className="text-xs text-vanilla-dim bg-midnight-950 px-2 py-0.5 rounded font-mono border border-midnight-800">
            Status: {card.column}
          </span>
        </div>

        {/* Issue Title */}
        <h2 className="text-lg font-bold text-vanilla-50 mb-2 leading-snug pr-8">
          {card.title}
        </h2>

        {/* Assignee & Dates Bar */}
        <div className="flex flex-wrap items-center gap-4 py-2 border-y border-midnight-700/80 mb-4 text-xs text-vanilla-dim">
          <div className="flex items-center gap-1.5">
            <span className="text-vanilla-dim">Assignee:</span>
            <div className="w-4 h-4 rounded-full bg-midnight-indigo flex items-center justify-center text-[9px] text-vanilla-50 font-bold">
              {card.assignee[0]}
            </div>
            <span className="text-vanilla-100 font-medium">{card.assignee}</span>
          </div>

          {card.dueDate && (
            <div className="flex items-center gap-1">
              <CalendarIcon size={12} className="text-vanilla-dim" />
              <span className="text-vanilla-dim">Due:</span>
              <span className="text-vanilla-200">{card.dueDate}</span>
            </div>
          )}

          {card.storyPoints && (
            <div className="flex items-center gap-1">
              <span className="text-vanilla-dim">Points:</span>
              <span className="text-vanilla-100 font-mono font-medium">{card.storyPoints} pts</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-midnight-700/80 mb-4 text-xs">
          <button
            onClick={() => setActiveTab('details')}
            className={`pb-2 px-1 font-semibold transition-colors border-b-2 ${
              activeTab === 'details'
                ? 'text-vanilla-100 border-midnight-glow'
                : 'text-vanilla-dim border-transparent hover:text-vanilla-200'
            }`}
          >
            Specification & Checklist
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`pb-2 px-1 font-semibold transition-colors border-b-2 ${
              activeTab === 'activity'
                ? 'text-vanilla-100 border-midnight-glow'
                : 'text-vanilla-dim border-transparent hover:text-vanilla-200'
            }`}
          >
            Audit Activity & Comments
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'details' ? (
          <div className="space-y-4">
            {/* Description */}
            <div className="bg-midnight-950 rounded-xl p-3.5 border border-midnight-700/80 text-xs text-vanilla-muted leading-relaxed font-mono">
              {card.description}
            </div>

            {/* Subtasks Checklist */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-vanilla-200 flex items-center gap-1.5">
                  <ListTodoIcon size={14} className="text-midnight-glow" />
                  Subtasks Checklist
                </span>
                <span className="text-[11px] text-vanilla-dim font-mono">
                  {localSubtasks.filter((s) => s.completed).length} / {localSubtasks.length} done
                </span>
              </div>

              <div className="space-y-2">
                {localSubtasks.map((st) => (
                  <label
                    key={st.id}
                    onClick={() => toggleSubtask(st.id)}
                    className="flex items-center gap-2.5 p-2 rounded-lg bg-midnight-850 hover:bg-midnight-800 border border-midnight-700/80 cursor-pointer text-xs transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={st.completed}
                      onChange={() => {}}
                      className="rounded border-midnight-600 text-midnight-indigo focus:ring-midnight-indigo bg-midnight-950"
                    />
                    <span className={st.completed ? 'line-through text-vanilla-dim' : 'text-vanilla-100'}>
                      {st.title}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              <div className="text-xs text-vanilla-muted flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-midnight-800 text-[10px] flex items-center justify-center font-bold text-vanilla-200 mt-0.5">
                  {card.assignee[0]}
                </div>
                <div>
                  <span className="font-semibold text-vanilla-100">{card.assignee}</span> moved this issue to{' '}
                  <span className="text-midnight-glow font-mono">{card.column}</span>
                  <div className="text-[10px] text-vanilla-dim">12 minutes ago</div>
                </div>
              </div>
              <div className="text-xs text-vanilla-muted flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-midnight-800 text-[10px] flex items-center justify-center font-bold text-vanilla-200 mt-0.5">
                  CI
                </div>
                <div>
                  <span className="font-semibold text-vanilla-100">GitHub Actions</span> automated check passed
                  <div className="text-[10px] text-vanilla-dim">25 minutes ago</div>
                </div>
              </div>
            </div>

            {/* Comment Box */}
            <div className="pt-2 border-t border-midnight-700/80 flex gap-2">
              <input
                type="text"
                placeholder="Write an internal comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-midnight-950 text-xs rounded-lg border border-midnight-700 text-vanilla-100 placeholder-vanilla-dim focus:outline-none focus:border-midnight-indigo"
              />
              <button
                onClick={() => setCommentText('')}
                className="px-3 py-1.5 bg-vanilla-100 hover:bg-vanilla-50 text-midnight-950 text-xs font-semibold rounded-lg transition-colors shadow-sm"
              >
                Send
              </button>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="mt-6 pt-3 border-t border-midnight-700/80 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-midnight-800 hover:bg-midnight-750 text-vanilla-200 text-xs font-medium rounded-lg border border-midnight-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
