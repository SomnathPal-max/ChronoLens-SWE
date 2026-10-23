// ── Board component ─────────────────────────────────────────────────
import React, { useState } from 'react';
import type { CardData, ColumnId, ColumnData } from '../types';
import { Column } from './Column';
import { Modal } from './Modal';
import { getBugConfig, recordGroundTruth } from '../bugs';

interface BoardProps {
  getCardsByColumn: (column: ColumnId) => CardData[];
  moveCard: (cardId: string, targetColumn: ColumnId) => void;
}

const COLUMNS: ColumnData[] = [
  { id: 'todo', title: 'To Do', dataCl: 'column-todo' },
  { id: 'inprogress', title: 'In Progress', dataCl: 'column-inprogress' },
  { id: 'done', title: 'Done', dataCl: 'column-done' },
];

export const Board: React.FC<BoardProps> = ({ getCardsByColumn, moveCard }) => {
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
      className="flex-1 p-6 overflow-x-auto"
      style={boardContainerStyle}
    >
      <div className="flex gap-6 max-w-7xl mx-auto justify-center">
        {COLUMNS.map((col) => (
          <Column
            key={col.id}
            id={col.id}
            title={col.title}
            dataCl={col.dataCl}
            cards={getCardsByColumn(col.id)}
            onDrop={handleDrop}
            onCardClick={handleCardClick}
          />
        ))}
      </div>

      {/* Modal renders INSIDE the board container — affected by Bug 2 stacking context */}
      <Modal card={selectedCard} onClose={handleCloseModal} />
    </div>
  );
};
