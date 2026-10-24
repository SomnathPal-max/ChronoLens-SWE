// ── Modal component ─────────────────────────────────────────────────
import React, { useEffect, useRef, useState } from 'react';
import type { CardData, PriorityLevel, Subtask } from '../types';
import { XIcon, FlameIcon, CalendarIcon, ListTodoIcon, MessageSquareIcon, CheckCircleIcon } from './icons';

interface ModalProps {
  card: CardData | null;
  onClose: () => void;
  onToggleSubtask?: (cardId: string, subtaskId: string) => void;
}

const priorityConfig: Record<PriorityLevel, { label: string; badge: string; iconColor: string }> = {
  urgent: { label: 'Urgent', badge: 'bg-rose-950/60 text-rose-300 border-rose-700/50', iconColor: 'text-rose-400' },
  high: { label: 'High', badge: 'bg-amber-950/60 text-amber-300 border-amber-700/50', iconColor: 'text-amber-400' },
  medium: { label: 'Medium', badge: 'bg-blue-950/60 text-blue-300 border-blue-700/50', iconColor: 'text-blue-400' },
  low: { label: 'Low', badge: 'bg-emerald-950/60 text-emerald-300 border-emerald-700/50', iconColor: 'text-emerald-400' },
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
      className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
      style={{ zIndex: 9999 }}
      onClick={handleOverlayClick}
    >
      <div
        data-cl="modal"
        className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-xl w-full p-6 relative text-slate-100 my-8"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          aria-label="Close modal"
        >
          <XIcon size={18} />
        </button>

        {/* Issue Header */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
            {card.key || card.id.toUpperCase()}
          </span>
          <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${pConfig.badge}`}>
            {card.priority === 'urgent' && <FlameIcon size={11} className={pConfig.iconColor} />}
            <span>{pConfig.label}</span>
          </span>
          <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded font-mono">
            Status: {card.column}
          </span>
        </div>

        {/* Issue Title */}
        <h2 className="text-lg font-bold text-white mb-2 leading-snug pr-8">
          {card.title}
        </h2>

        {/* Assignee & Dates Bar */}
        <div className="flex flex-wrap items-center gap-4 py-2 border-y border-slate-800 mb-4 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Assignee:</span>
            <div className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center text-[9px] text-white font-bold">
              {card.assignee[0]}
            </div>
            <span className="text-slate-200 font-medium">{card.assignee}</span>
          </div>

          {card.dueDate && (
            <div className="flex items-center gap-1">
              <CalendarIcon size={12} className="text-slate-500" />
              <span className="text-slate-500">Due:</span>
              <span className="text-slate-200">{card.dueDate}</span>
            </div>
          )}

          {card.storyPoints && (
            <div className="flex items-center gap-1">
              <span className="text-slate-500">Points:</span>
              <span className="text-slate-200 font-mono font-medium">{card.storyPoints} pts</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 mb-4 text-xs">
          <button
            onClick={() => setActiveTab('details')}
            className={`pb-2 px-1 font-semibold transition-colors border-b-2 ${
              activeTab === 'details'
                ? 'text-indigo-400 border-indigo-500'
                : 'text-slate-500 border-transparent hover:text-slate-300'
            }`}
          >
            Specification & Checklist
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`pb-2 px-1 font-semibold transition-colors border-b-2 ${
              activeTab === 'activity'
                ? 'text-indigo-400 border-indigo-500'
                : 'text-slate-500 border-transparent hover:text-slate-300'
            }`}
          >
            Audit Activity & Comments
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'details' ? (
          <div className="space-y-4">
            {/* Description */}
            <div className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-800/80 text-xs text-slate-300 leading-relaxed font-mono">
              {card.description}
            </div>

            {/* Subtasks Checklist */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <ListTodoIcon size={14} className="text-indigo-400" />
                  Subtasks Checklist
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {localSubtasks.filter((s) => s.completed).length} / {localSubtasks.length} done
                </span>
              </div>

              <div className="space-y-2">
                {localSubtasks.map((st) => (
                  <label
                    key={st.id}
                    onClick={() => toggleSubtask(st.id)}
                    className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-800/40 hover:bg-slate-800 border border-slate-800/80 cursor-pointer text-xs transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={st.completed}
                      onChange={() => {}}
                      className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-900"
                    />
                    <span className={st.completed ? 'line-through text-slate-500' : 'text-slate-200'}>
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
              <div className="text-xs text-slate-400 flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-slate-800 text-[10px] flex items-center justify-center font-bold text-slate-300 mt-0.5">
                  {card.assignee[0]}
                </div>
                <div>
                  <span className="font-semibold text-slate-200">{card.assignee}</span> moved this issue to{' '}
                  <span className="text-indigo-400 font-mono">{card.column}</span>
                  <div className="text-[10px] text-slate-500">12 minutes ago</div>
                </div>
              </div>
              <div className="text-xs text-slate-400 flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-slate-800 text-[10px] flex items-center justify-center font-bold text-slate-300 mt-0.5">
                  CI
                </div>
                <div>
                  <span className="font-semibold text-slate-200">GitHub Actions</span> automated check passed
                  <div className="text-[10px] text-slate-500">25 minutes ago</div>
                </div>
              </div>
            </div>

            {/* Comment Box */}
            <div className="pt-2 border-t border-slate-800 flex gap-2">
              <input
                type="text"
                placeholder="Write an internal comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-slate-950/80 text-xs rounded-lg border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={() => setCommentText('')}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="mt-6 pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
