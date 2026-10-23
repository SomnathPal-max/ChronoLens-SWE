// ── Column component ────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import type { CardData, ColumnId } from '../types';
import { Card } from './Card';
import { getBugConfig, recordGroundTruth } from '../bugs';

interface ColumnProps {
  id: ColumnId;
  title: string;
  dataCl: string;
  cards: CardData[];
  onDrop: (cardId: string, targetColumn: ColumnId) => void;
  onCardClick: (card: CardData) => void;
  onAddCard?: () => void;
}

const columnColors: Record<ColumnId, { header: string; dot: string }> = {
  todo: { header: 'text-blue-700', dot: 'bg-blue-500' },
  inprogress: { header: 'text-amber-700', dot: 'bg-amber-500' },
  done: { header: 'text-green-700', dot: 'bg-green-500' },
};

export const Column: React.FC<ColumnProps> = ({
  id,
  title,
  dataCl,
  cards,
  onDrop,
  onCardClick,
  onAddCard,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const cfg = getBugConfig();

  useEffect(() => {
    if (cfg.bug3 && id === 'todo') {
      recordGroundTruth({
        bug: 3,
        type: 'clipping',
        element: 'add-card-btn',
        description: 'Add New Card button label is cut off at narrow viewport',
      });
    }
  }, [cfg.bug3, id]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const cardId = e.dataTransfer.getData('text/plain');
    if (cardId) {
      onDrop(cardId, id);
    }
  };

  // Bug 3: clipping style for the Add Card button
  const addBtnStyle: React.CSSProperties = cfg.bug3
    ? { width: '120px', whiteSpace: 'nowrap', overflow: 'hidden' }
    : {};

  const handleAddClick = () => {
    if (cfg.bug3) {
      recordGroundTruth({
        bug: 3,
        type: 'clipping',
        element: 'add-card-btn',
        description: 'Add New Card button label is cut off at narrow viewport',
      });
    }
    onAddCard?.();
  };

  return (
    <div
      data-cl={dataCl}
      className={`flex flex-col bg-gray-100 rounded-xl min-w-[280px] w-full max-w-sm transition-colors ${
        isDragOver ? 'bg-blue-50 ring-2 ring-blue-300' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column header */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${columnColors[id].dot}`} />
          <h2 className={`font-bold text-sm uppercase tracking-wider ${columnColors[id].header}`}>
            {title}
          </h2>
        </div>
        <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full font-medium">
          {cards.length}
        </span>
      </div>

      {/* Cards list */}
      <div className="flex-1 px-3 pb-3 space-y-3 min-h-[120px]">
        {cards.map((card) => (
          <Card key={card.id} card={card} onClick={onCardClick} />
        ))}
      </div>

      {/* Add card button */}
      {id === 'todo' && (
        <div className="px-3 pb-3">
          <button
            data-cl="add-card-btn"
            onClick={handleAddClick}
            className="w-full text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg py-2 transition-colors flex items-center justify-center gap-1"
            style={addBtnStyle}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add New Card
          </button>
        </div>
      )}
    </div>
  );
};
