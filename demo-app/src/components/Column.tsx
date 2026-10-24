// ── Column component ────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import type { CardData, ColumnId } from '../types';
import { Card } from './Card';
import { PlusIcon } from './icons';
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

const columnMeta: Record<ColumnId, { dot: string; text: string; bg: string }> = {
  todo: { dot: 'bg-midnight-glow', text: 'text-vanilla-100', bg: 'bg-midnight-indigo/20' },
  inprogress: { dot: 'bg-amber-400', text: 'text-vanilla-100', bg: 'bg-amber-500/20' },
  done: { dot: 'bg-emerald-400', text: 'text-vanilla-100', bg: 'bg-emerald-500/20' },
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

  const meta = columnMeta[id] || columnMeta.todo;

  return (
    <div
      data-cl={dataCl}
      className={`flex flex-col bg-midnight-850/80 backdrop-blur-sm rounded-2xl border border-midnight-700/80 min-w-[300px] w-full max-w-sm transition-all duration-150 ${
        isDragOver ? 'ring-2 ring-midnight-indigo bg-midnight-800/90' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column Header */}
      <div className="px-4 py-3.5 border-b border-midnight-700/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${meta.dot} shadow-[0_0_6px_currentColor]`} />
          <h2 className={`font-semibold text-xs tracking-wider uppercase ${meta.text}`}>
            {title}
          </h2>
          <span className="text-[11px] font-mono text-vanilla-muted bg-midnight-900 border border-midnight-700/60 px-2 py-0.5 rounded-full font-medium">
            {cards.length}
          </span>
        </div>

        {/* Add Card action button (for Bug 3 testing and creation) */}
        {id === 'todo' && (
          <button
            data-cl="add-card-btn"
            onClick={handleAddClick}
            style={addBtnStyle}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-vanilla-100 hover:bg-vanilla-50 text-midnight-950 border border-vanilla-200 shadow-[0_0_10px_rgba(253,248,236,0.15)] transition-all"
            title="Add a new card to To Do"
          >
            <PlusIcon size={12} />
            <span>Add New Card</span>
          </button>
        )}
      </div>

      {/* Cards Scroll Area */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto min-h-[450px]">
        {cards.map((card) => (
          <Card key={card.id} card={card} onClick={onCardClick} />
        ))}

        {cards.length === 0 && (
          <div className="h-40 flex flex-col items-center justify-center border-2 border-dashed border-midnight-700 rounded-xl text-vanilla-dim text-xs">
            <span>No issues in {title}</span>
            <span className="text-[10px] text-vanilla-dim mt-1">Drag an issue here</span>
          </div>
        )}
      </div>
    </div>
  );
};
