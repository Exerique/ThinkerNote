import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { websocketService } from '../services/websocket';
import { useApp, ConnectionStatus } from './AppContext';
import {
  WSMessage,
  Note,
  Board,
  CreateNotePayload,
  UpdateNotePayload,
  DeleteNotePayload,
  MoveNotePayload,
  CreateBoardPayload,
  DeleteBoardPayload,
  RenameBoardPayload,
  SyncResponsePayload,
} from '../../../shared/src/types';

interface WebSocketContextType {
  sendCreateNote: (payload: CreateNotePayload) => void;
  sendUpdateNote: (payload: UpdateNotePayload) => void;
  sendDeleteNote: (payload: DeleteNotePayload) => void;
  sendMoveNote: (payload: MoveNotePayload) => void;
  sendEditingStart: (noteId: string) => void;
  sendEditingEnd: (noteId: string) => void;
  sendCreateBoard: (payload: CreateBoardPayload) => void;
  sendDeleteBoard: (payload: DeleteBoardPayload) => void;
  sendRenameBoard: (payload: RenameBoardPayload) => void;
  requestSync: (boardId: string) => void;
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: ReactNode;
  serverUrl?: string;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
  children,
  serverUrl = 'http://localhost:3001',
}) => {
  // Track pending note creation to prevent duplicates
  const pendingNoteCreationRef = React.useRef<Set<string>>(new Set());
  
  const {
    addNote,
    updateNote,
    deleteNote,
    addBoard,
    updateBoard,
    deleteBoard,
    setConnectionStatus,
    addToast,
    currentBoardId,
  } = useApp();
  
  const getCurrentBoardId = React.useCallback(() => currentBoardId, [currentBoardId]);

  useEffect(() => {
    // Connect to WebSocket server
    websocketService.connect(serverUrl);

    // Set up message handlers
    const handleNoteCreate = (message: WSMessage) => {
      // Server sends the note in the payload directly
      const note = message.payload as Note;
      addNote(note);
    };

    const handleNoteUpdate = (message: WSMessage) => {
      // Server sends the full updated note
      const note = message.payload as Note;
      updateNote(note.id, note);
    };

    const handleNoteDelete = (message: WSMessage) => {
      const { noteId } = message.payload as DeleteNotePayload;
      deleteNote(noteId);
    };

    const handleNoteMove = (message: WSMessage) => {
      const { noteId, x, y } = message.payload as MoveNotePayload;
      updateNote(noteId, { x, y });
    };

    const handleBoardCreate = (message: WSMessage) => {
      const board = message.payload as Board;
      // Only add if it's from another user
      if (message.userId !== websocketService.getUserId()) {
        addBoard(board);
      }
    };

    const handleBoardDelete = (message: WSMessage) => {
      const { boardId } = message.payload as DeleteBoardPayload;
      deleteBoard(boardId);
    };

    const handleBoardRename = (message: WSMessage) => {
      // Server sends the full updated board
      const board = message.payload as Board;
      updateBoard(board.id, { name: board.name });
    };

    const handleEditingStart = (message: WSMessage) => {
      const { noteId, userId } = message.payload;
      updateNote(noteId, { editingBy: userId });
    };

    const handleEditingEnd = (message: WSMessage) => {
      const { noteId } = message.payload;
      updateNote(noteId, { editingBy: undefined });
    };

    const handleSyncResponse = (message: WSMessage) => {
      // Check if this is a connection status update
      if (message.payload.status) {
        const status = message.payload.status as ConnectionStatus;
        setConnectionStatus(status);
        
        // Show toast notification for connection state changes
        if (status === 'connected') {
          addToast({
            message: 'Connected to server',
            type: 'success',
            duration: 2000,
          });
          
          // Re-sync current board on reconnect
          const currentBoardId = getCurrentBoardId();
          if (currentBoardId) {
            websocketService.requestSync(currentBoardId);
          }
        } else if (status === 'disconnected') {
          addToast({
            message: 'Disconnected from server',
            type: 'error',
            duration: 3000,
          });
        } else if (status === 'reconnecting') {
          addToast({
            message: 'Reconnecting to server...',
            type: 'warning',
            duration: 2000,
          });
        }
        return;
      }

      // Otherwise, it's a sync response with board data
      const { board } = message.payload as SyncResponsePayload;
      if (board) {
        // Use addBoard or updateBoard instead
        addBoard(board);
      }
    };

    // Register handlers
    websocketService.on('note:create', handleNoteCreate);
    websocketService.on('note:update', handleNoteUpdate);
    websocketService.on('note:delete', handleNoteDelete);
    websocketService.on('note:move', handleNoteMove);
    websocketService.on('note:editing:start', handleEditingStart);
    websocketService.on('note:editing:end', handleEditingEnd);
    websocketService.on('board:create', handleBoardCreate);
    websocketService.on('board:delete', handleBoardDelete);
    websocketService.on('board:rename', handleBoardRename);
    websocketService.on('sync:response', handleSyncResponse);

    // Cleanup on unmount
    return () => {
      websocketService.off('note:create', handleNoteCreate);
      websocketService.off('note:update', handleNoteUpdate);
      websocketService.off('note:delete', handleNoteDelete);
      websocketService.off('note:move', handleNoteMove);
      websocketService.off('note:editing:start', handleEditingStart);
      websocketService.off('note:editing:end', handleEditingEnd);
      websocketService.off('board:create', handleBoardCreate);
      websocketService.off('board:delete', handleBoardDelete);
      websocketService.off('board:rename', handleBoardRename);
      websocketService.off('sync:response', handleSyncResponse);
      websocketService.disconnect();
    };
  }, [serverUrl, addNote, updateNote, deleteNote, addBoard, updateBoard, deleteBoard, setConnectionStatus, addToast]);

  const sendCreateNote = React.useCallback((payload: CreateNotePayload) => {
    // Create a unique key for this note creation request
    const key = `${payload.boardId}-${payload.x}-${payload.y}`;
    
    // Check if we already have a pending creation for this position
    if (pendingNoteCreationRef.current.has(key)) {
      return; // Debounce duplicate requests
    }
    
    // Mark as pending
    pendingNoteCreationRef.current.add(key);
    
    // Send the request
    websocketService.send('note:create', payload);
    
    // Clear pending after 500ms
    setTimeout(() => {
      pendingNoteCreationRef.current.delete(key);
    }, 500);
  }, []);

  const sendUpdateNote = React.useCallback((payload: UpdateNotePayload) => {
    websocketService.send('note:update', payload);
  }, []);

  const sendDeleteNote = React.useCallback((payload: DeleteNotePayload) => {
    websocketService.send('note:delete', payload);
  }, []);

  const sendMoveNote = React.useCallback((payload: MoveNotePayload) => {
    websocketService.send('note:move', payload);
  }, []);

  const sendEditingStart = React.useCallback((noteId: string) => {
    websocketService.send('note:editing:start', { noteId, userId: websocketService.getUserId() });
  }, []);

  const sendEditingEnd = React.useCallback((noteId: string) => {
    websocketService.send('note:editing:end', { noteId, userId: websocketService.getUserId() });
  }, []);

  const sendCreateBoard = React.useCallback((payload: CreateBoardPayload) => {
    websocketService.send('board:create', payload);
  }, []);

  const sendDeleteBoard = React.useCallback((payload: DeleteBoardPayload) => {
    websocketService.send('board:delete', payload);
  }, []);

  const sendRenameBoard = React.useCallback((payload: RenameBoardPayload) => {
    websocketService.send('board:rename', payload);
  }, []);

  const requestSyncCallback = React.useCallback((boardId: string) => {
    websocketService.requestSync(boardId);
  }, []);

  const value: WebSocketContextType = React.useMemo(() => ({
    sendCreateNote,
    sendUpdateNote,
    sendDeleteNote,
    sendMoveNote,
    sendEditingStart,
    sendEditingEnd,
    sendCreateBoard,
    sendDeleteBoard,
    sendRenameBoard,
    requestSync: requestSyncCallback,
    isConnected: websocketService.isConnected(),
  }), [
    sendCreateNote,
    sendUpdateNote,
    sendDeleteNote,
    sendMoveNote,
    sendEditingStart,
    sendEditingEnd,
    sendCreateBoard,
    sendDeleteBoard,
    sendRenameBoard,
    requestSyncCallback,
  ]);

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};
