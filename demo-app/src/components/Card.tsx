// ── Card component (draggable) ──────────────────────────────────────
import React from 'react';
import type { CardData } from '../types';

interface CardProps {
  card: CardData;
  onClick: (card: CardData) => void;
}

const priorityDot: Record<string, string> = {
  low: 'bg-green-400',
  medium: 'bg-yellow-400',
  high: 'bg-red-400',
};

export const Card: React.FC<CardProps> = ({ card, onClick }) => {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/plain', card.id);
    e.dataTransfer.effectAllowed = 'move';
    // Add a slight opacity while dragging
    (e.target as HTMLDivElement).style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    (e.target as HTMLDivElement).style.opacity = '1';
  };

  return (
    <div
      data-cl={card.id}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => onClick(card)}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow select-none"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900 leading-snug">{card.title}</h3>
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ml-2 ${priorityDot[card.priority]}`} />
      </div>
      <p className="text-xs text-gray-500 line-clamp-2 mb-3">{card.description}</p>
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-[10px] text-white font-bold">
          {card.assignee[0]}
        </div>
        <span className="text-xs text-gray-400">{card.assignee}</span>
      </div>
    </div>
  );
};
