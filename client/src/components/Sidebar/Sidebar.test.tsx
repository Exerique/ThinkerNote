import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Sidebar from './Sidebar';

// Mock contexts
vi.mock('../../contexts/AppContext', () => ({
  useApp: () => ({
    boards: [
      { id: 'board-1', name: 'Test Board', notes: [], createdAt: Date.now(), updatedAt: Date.now() },
      { id: 'board-2', name: 'Another Board', notes: [{ content: 'test note' }], createdAt: Date.now(), updatedAt: Date.now() },
    ],
    currentBoardId: 'board-1',
    setCurrentBoardId: vi.fn(),
  }),
}));

vi.mock('../../contexts/WebSocketContext', () => ({
  useWebSocket: () => ({
    sendCreateBoard: vi.fn(),
    sendDeleteBoard: vi.fn(),
    sendRenameBoard: vi.fn(),
  }),
}));

describe('Sidebar Component', () => {
  it('renders board list', () => {
    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );
    expect(screen.getByText('Test Board')).toBeInTheDocument();
    expect(screen.getByText('Another Board')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );
    expect(screen.getByPlaceholderText('Search notes...')).toBeInTheDocument();
  });

  it('renders new board button', () => {
    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );
    expect(screen.getByLabelText('Create New Board')).toBeInTheDocument();
  });
});
