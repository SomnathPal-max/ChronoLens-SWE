// ── Modal component ─────────────────────────────────────────────────
import React, { useEffect, useRef } from 'react';
import type { CardData } from '../types';

interface ModalProps {
  card: CardData | null;
  onClose: () => void;
}

const priorityColors: Record<string, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
};

export const Modal: React.FC<ModalProps> = ({ card, onClose }) => {
  const overlayRef = useRef<HTMLDivElement>(null);

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

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 flex items-center justify-center bg-black/50 p-4"
      style={{ zIndex: 9999 }}
      onClick={handleOverlayClick}
    >
      <div
        data-cl="modal"
        className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"
          aria-label="Close modal"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-xl font-bold text-gray-900 mb-2 pr-8">{card.title}</h2>

        <div className="flex items-center gap-2 mb-4">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[card.priority]}`}>
            {card.priority}
          </span>
          <span className="text-sm text-gray-500">Assigned to {card.assignee}</span>
        </div>

        <p className="text-gray-700 mb-4 leading-relaxed">{card.description}</p>

        <div className="text-xs text-gray-400">
          Column: <span className="font-medium text-gray-600">{card.column}</span> &middot; ID: <span className="font-mono">{card.id}</span>
        </div>
      </div>
    </div>
  );
};
