// ── Card component (draggable) ──────────────────────────────────────
import React from 'react';
import type { CardData, PriorityLevel } from '../types';
import { FlameIcon, CalendarIcon, ListTodoIcon, MessageSquareIcon } from './icons';

interface CardProps {
  card: CardData;
  onClick: (card: CardData) => void;
}

const priorityConfig: Record<PriorityLevel, { label: string; badge: string; iconColor: string }> = {
  urgent: { label: 'Urgent', badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20', iconColor: 'text-rose-400' },
  high: { label: 'High', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20', iconColor: 'text-amber-400' },
  medium: { label: 'Medium', badge: 'bg-sky-500/10 text-sky-400 border-sky-500/20', iconColor: 'text-sky-400' },
  low: { label: 'Low', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', iconColor: 'text-emerald-400' },
};

const avatarColors: Record<string, string> = {
  Alice: 'bg-amber-700',
  Bob: 'bg-emerald-700',
  Carol: 'bg-indigo-700',
  Dave: 'bg-stone-700',
  Eve: 'bg-rose-700',
  Frank: 'bg-cyan-700',
  Grace: 'bg-teal-700',
};

export const Card: React.FC<CardProps> = ({ card, onClick }) => {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/plain', card.id);
    e.dataTransfer.effectAllowed = 'move';
    (e.target as HTMLDivElement).style.opacity = '0.4';
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    (e.target as HTMLDivElement).style.opacity = '1';
  };

  const pConfig = priorityConfig[card.priority] || priorityConfig.medium;
  const avatarBg = avatarColors[card.assignee] || 'bg-midnight-700';

  const completedSubtasks = card.subtasks ? card.subtasks.filter((s) => s.completed).length : 0;
  const totalSubtasks = card.subtasks ? card.subtasks.length : 0;

  return (
    <div
      data-cl={card.id}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => onClick(card)}
      className="bg-midnight-800 hover:bg-midnight-750 rounded-lg shadow-sm border border-midnight-700 hover:border-midnight-600 p-3.5 cursor-grab active:cursor-grabbing transition-all select-none group"
    >
      {/* Top Header: Issue Key, Priority & Due Date */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono font-semibold text-vanilla-dim group-hover:text-amber-brand transition-colors">
            {card.key || card.id.toUpperCase()}
          </span>
          <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${pConfig.badge}`}>
            {card.priority === 'urgent' && <FlameIcon size={10} className={pConfig.iconColor} />}
            <span>{pConfig.label}</span>
          </span>
        </div>

        {card.dueDate && (
          <span className="flex items-center gap-1 text-[11px] text-vanilla-dim">
            <CalendarIcon size={11} className="text-vanilla-dim" />
            <span>{card.dueDate}</span>
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-vanilla-100 group-hover:text-vanilla-50 leading-snug mb-1.5 transition-colors">
        {card.title}
      </h3>

      {/* Description Snippet */}
      <p className="text-xs text-vanilla-muted line-clamp-2 mb-3 leading-relaxed">
        {card.description}
      </p>

      {/* Tag Badges */}
      {card.tags && card.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {card.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-midnight-900 text-vanilla-200 border border-midnight-700/80"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Card Footer: Subtasks, Comments & Assignee */}
      <div className="flex items-center justify-between pt-2.5 border-t border-midnight-700/70 text-[11px] text-vanilla-dim">
        <div className="flex items-center gap-3">
          {totalSubtasks > 0 && (
            <span
              className={`flex items-center gap-1 ${
                completedSubtasks === totalSubtasks ? 'text-emerald-400' : 'text-vanilla-muted'
              }`}
              title={`${completedSubtasks}/${totalSubtasks} subtasks completed`}
            >
              <ListTodoIcon size={12} />
              <span>
                {completedSubtasks}/{totalSubtasks}
              </span>
            </span>
          )}

          {typeof card.commentsCount === 'number' && card.commentsCount > 0 && (
            <span className="flex items-center gap-1 text-vanilla-muted">
              <MessageSquareIcon size={11} />
              <span>{card.commentsCount}</span>
            </span>
          )}
        </div>

        {/* Assignee Avatar */}
        <div className="flex items-center gap-1.5">
          <div
            className={`w-5 h-5 rounded-full ${avatarBg} flex items-center justify-center text-[10px] text-vanilla-50 font-bold shadow-sm`}
            title={`Assigned to ${card.assignee}`}
          >
            {card.assignee[0]}
          </div>
          <span className="text-[11px] text-vanilla-muted font-medium">{card.assignee}</span>
        </div>
      </div>
    </div>
  );
};
