import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Note from './Note';
import { Note as NoteType } from '../../../../shared/src/types';

// Mock contexts
vi.mock('../../contexts/WebSocketContext', () => ({
  useWebSocket: () => ({
    sendUpdateNote: vi.fn(),
    sendDeleteNote: vi.fn(),
    sendMoveNote: vi.fn(),
  }),
}));

vi.mock('../../contexts/PhysicsContext', () => ({
  usePhysicsContext: () => ({
    applyMomentum: vi.fn(),
    setNoteStatic: vi.fn(),
    setNotePosition: vi.fn(),
  }),
}));

vi.mock('../../contexts/AppContext', () => ({
  useApp: () => ({
    addToast: vi.fn(),
  }),
}));

describe('Note Component', () => {
  const mockNote: NoteType = {
    id: 'note-1',
    boardId: 'board-1',
    x: 100,
    y: 100,
    width: 280,
    height: 200,
    content: 'Test note content',
    backgroundColor: '#FFD60A',
    fontSize: 'medium',
    isExpanded: false,
    images: [],
    stickers: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  it('renders note with content', () => {
    render(<Note note={mockNote} />);
    expect(screen.getByText(/Test note content/)).toBeInTheDocument();
  });

  it('renders collapsed note with preview', () => {
    render(<Note note={mockNote} />);
    const preview = screen.getByText(/Test note content/);
    expect(preview).toBeInTheDocument();
  });

  it('renders expanded note with full content', () => {
    const expandedNote = { ...mockNote, isExpanded: true };
    render(<Note note={expandedNote} />);
    expect(screen.getByText(/Test note content/)).toBeInTheDocument();
  });
});
