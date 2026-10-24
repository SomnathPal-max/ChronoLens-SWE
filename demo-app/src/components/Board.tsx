// ── Board component ─────────────────────────────────────────────────
import React, { useState } from 'react';
import type { CardData, ColumnId, ColumnData } from '../types';
import { Column } from './Column';
import { Modal } from './Modal';
import { getBugConfig, recordGroundTruth } from '../bugs';

interface BoardProps {
  getCardsByColumn: (column: ColumnId) => CardData[];
  moveCard: (cardId: string, targetColumn: ColumnId) => void;
  onAddCard?: () => void;
}

const COLUMNS: ColumnData[] = [
  { id: 'todo', title: 'To Do', dataCl: 'column-todo', badgeColor: 'border-indigo-500' },
  { id: 'inprogress', title: 'In Progress', dataCl: 'column-inprogress', badgeColor: 'border-amber-500' },
  { id: 'done', title: 'Done', dataCl: 'column-done', badgeColor: 'border-emerald-500' },
];

export const Board: React.FC<BoardProps> = ({ getCardsByColumn, moveCard, onAddCard }) => {
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  const cfg = getBugConfig();

  const handleDrop = (cardId: string, targetColumn: ColumnId) => {
    moveCard(cardId, targetColumn);
  };

  const handleCardClick = (card: CardData) => {
    setSelectedCard(card);
    if (cfg.bug2) {
      recordGroundTruth({
        bug: 2,
        type: 'z-index-trap',
        element: 'modal',
        description: 'Modal trapped under navbar due to stacking context from transform',
      });
    }
  };

  const handleCloseModal = () => {
    setSelectedCard(null);
  };

  // Bug 2: the board container gets a transform that creates a new stacking context
  const boardContainerStyle: React.CSSProperties = cfg.bug2
    ? { transform: 'translateZ(0)' }
    : {};

  return (
    <div
      data-cl="kanban-board"
      className="flex-1 p-6 overflow-x-auto bg-midnight-950 min-h-[calc(100vh-3.5rem)]"
      style={boardContainerStyle}
    >
      <div className="flex gap-6 max-w-7xl mx-auto justify-start lg:justify-center items-start">
        {COLUMNS.map((col) => (
          <Column
            key={col.id}
            id={col.id}
            title={col.title}
            dataCl={col.dataCl}
            cards={getCardsByColumn(col.id)}
            onDrop={handleDrop}
            onCardClick={handleCardClick}
            onAddCard={onAddCard}
          />
        ))}
      </div>

      {/* Modal renders INSIDE the board container — affected by Bug 2 stacking context */}
      <Modal card={selectedCard} onClose={handleCloseModal} />
    </div>
  );
};
