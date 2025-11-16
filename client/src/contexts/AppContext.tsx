import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Board, Note } from '../../../shared/src/types';
import { ToastMessage } from '../components/Toast/Toast';

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

interface AppContextType {
  boards: Board[];
  setBoards: (boards: Board[]) => void;
  currentBoardId: string | null;
  setCurrentBoardId: (boardId: string | null) => void;
  connectionStatus: ConnectionStatus;
  setConnectionStatus: (status: ConnectionStatus) => void;
  toasts: ToastMessage[];
  addToast: (message: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  addBoard: (board: Board) => void;
  updateBoard: (boardId: string, updates: Partial<Board>) => void;
  deleteBoard: (boardId: string) => void;
  addNote: (note: Note) => void;
  updateNote: (noteId: string, updates: Partial<Note>) => void;
  deleteNote: (noteId: string) => void;
  getCurrentBoard: () => Board | undefined;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [boards, setBoards] = useState<Board[]>([]);
  const [currentBoardId, setCurrentBoardId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { ...message, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const addBoard = useCallback((board: Board) => {
    setBoards(prev => {
      // Check if board already exists to prevent duplicates
      const boardExists = prev.some(b => b.id === board.id);
      if (boardExists) {
        // Update existing board instead
        return prev.map(b => b.id === board.id ? board : b);
      }
      return [...prev, board];
    });
  }, []);

  const updateBoard = useCallback((boardId: string, updates: Partial<Board>) => {
    setBoards(prev =>
      prev.map(board =>
        board.id === boardId ? { ...board, ...updates } : board
      )
    );
  }, []);

  const deleteBoard = useCallback((boardId: string) => {
    setBoards(prev => prev.filter(board => board.id !== boardId));
    if (currentBoardId === boardId) {
      setCurrentBoardId(null);
    }
  }, [currentBoardId]);

  const addNote = useCallback((note: Note) => {
    setBoards(prev =>
      prev.map(board => {
        if (board.id === note.boardId) {
          // Check if note already exists to prevent duplicates
          const noteExists = board.notes.some(n => n.id === note.id);
          if (noteExists) {
            return board;
          }
          return { ...board, notes: [...board.notes, note] };
        }
        return board;
      })
    );
  }, []);

  const updateNote = useCallback((noteId: string, updates: Partial<Note>) => {
    setBoards(prev =>
      prev.map(board => ({
        ...board,
        notes: board.notes.map(note =>
          note.id === noteId ? { ...note, ...updates } : note
        ),
      }))
    );
  }, []);

  const deleteNote = useCallback((noteId: string) => {
    setBoards(prev =>
      prev.map(board => ({
        ...board,
        notes: board.notes.filter(note => note.id !== noteId),
      }))
    );
  }, []);

  const getCurrentBoard = useCallback(() => {
    return boards.find(board => board.id === currentBoardId);
  }, [boards, currentBoardId]);

  const value: AppContextType = {
    boards,
    setBoards,
    currentBoardId,
    setCurrentBoardId,
    connectionStatus,
    setConnectionStatus,
    toasts,
    addToast,
    removeToast,
    addBoard,
    updateBoard,
    deleteBoard,
    addNote,
    updateNote,
    deleteNote,
    getCurrentBoard,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
