import { Server, Socket } from 'socket.io';
import { StateManager } from '../services/stateManager.js';
import { logger } from '../utils/logger.js';
import {
  WSMessage,
  CreateNotePayload,
  UpdateNotePayload,
  DeleteNotePayload,
  MoveNotePayload,
  CreateBoardPayload,
  DeleteBoardPayload,
  RenameBoardPayload,
  SyncRequestPayload,
} from '../../../shared/src/types.js';
import {
  validateWSMessage,
  validateCreateNotePayload,
  validateUpdateNotePayload,
  validateDeleteNotePayload,
  validateMoveNotePayload,
  validateCreateBoardPayload,
  validateDeleteBoardPayload,
  validateRenameBoardPayload,
  validateSyncRequestPayload,
  ValidationError,
} from '../../../shared/src/validation.js';

export function setupWebSocketHandlers(io: Server, stateManager: StateManager): void {
  io.on('connection', (socket: Socket) => {
    logger.info(`Client connected: ${socket.id}`, 'WebSocket');

    // Handle client joining a board room
    socket.on('join:board', (boardId: string) => {
      try {
        if (typeof boardId === 'string' && boardId.length > 0) {
          socket.join(`board:${boardId}`);
          logger.info(`Client ${socket.id} joined board: ${boardId}`, 'WebSocket');
        } else {
          logger.warn(`Invalid boardId received from ${socket.id}`, 'WebSocket');
        }
      } catch (error) {
        logger.error(error as Error, 'join:board');
      }
    });

    // Handle client leaving a board room
    socket.on('leave:board', (boardId: string) => {
      try {
        if (typeof boardId === 'string' && boardId.length > 0) {
          socket.leave(`board:${boardId}`);
          logger.info(`Client ${socket.id} left board: ${boardId}`, 'WebSocket');
        }
      } catch (error) {
        logger.error(error as Error, 'leave:board');
      }
    });

    // Handle note creation
    socket.on('note:create', (message: WSMessage) => {
      try {
        validateWSMessage(message);
        validateCreateNotePayload(message.payload);

        const payload = message.payload as CreateNotePayload;
        const note = stateManager.createNote(payload.boardId, payload.x, payload.y);

        if (note) {
          // Broadcast to all clients in the board room (including sender)
          io.to(`board:${payload.boardId}`).emit('note:created', {
            type: 'note:created',
            payload: note,
            timestamp: Date.now(),
            userId: message.userId,
          });
        } else {
          socket.emit('error', {
            message: 'Failed to create note',
            originalMessage: message,
          });
        }
      } catch (error) {
        logger.error(error as Error, 'note:create');
        socket.emit('error', {
          message: error instanceof ValidationError ? error.message : 'Invalid message format',
          originalMessage: message,
        });
      }
    });

    // Handle note updates
    socket.on('note:update', (message: WSMessage) => {
      try {
        validateWSMessage(message);
        validateUpdateNotePayload(message.payload);

        const payload = message.payload as UpdateNotePayload;
        const note = stateManager.updateNote(payload.noteId, payload.updates);

        if (note) {
          // Broadcast to all clients in the board room (including sender)
          io.to(`board:${note.boardId}`).emit('note:updated', {
            type: 'note:updated',
            payload: note,
            timestamp: Date.now(),
            userId: message.userId,
          });
        } else {
          socket.emit('error', {
            message: 'Failed to update note',
            originalMessage: message,
          });
        }
      } catch (error) {
        logger.error(error as Error, 'note:update');
        socket.emit('error', {
          message: error instanceof ValidationError ? error.message : 'Invalid message format',
          originalMessage: message,
        });
      }
    });

    // Handle note deletion
    socket.on('note:delete', (message: WSMessage) => {
      try {
        validateWSMessage(message);
        validateDeleteNotePayload(message.payload);

        const payload = message.payload as DeleteNotePayload;
        const note = stateManager.getNote(payload.noteId);

        if (note) {
          const boardId = note.boardId;
          const success = stateManager.deleteNote(payload.noteId);

          if (success) {
            // Broadcast to all clients in the board room (including sender)
            io.to(`board:${boardId}`).emit('note:deleted', {
              type: 'note:deleted',
              payload: { noteId: payload.noteId },
              timestamp: Date.now(),
              userId: message.userId,
            });
          }
        } else {
          socket.emit('error', {
            message: 'Note not found',
            originalMessage: message,
          });
        }
      } catch (error) {
        logger.error(error as Error, 'note:delete');
        socket.emit('error', {
          message: error instanceof ValidationError ? error.message : 'Invalid message format',
          originalMessage: message,
        });
      }
    });

    // Handle note movement
    socket.on('note:move', (message: WSMessage) => {
      try {
        validateWSMessage(message);
        validateMoveNotePayload(message.payload);

        const payload = message.payload as MoveNotePayload;
        const note = stateManager.moveNote(payload.noteId, payload.x, payload.y);

        if (note) {
          // Broadcast to all clients in the board room (including sender)
          io.to(`board:${note.boardId}`).emit('note:moved', {
            type: 'note:moved',
            payload: {
              noteId: note.id,
              x: note.x,
              y: note.y,
            },
            timestamp: Date.now(),
            userId: message.userId,
          });
        } else {
          socket.emit('error', {
            message: 'Failed to move note',
            originalMessage: message,
          });
        }
      } catch (error) {
        logger.error(error as Error, 'note:move');
        socket.emit('error', {
          message: error instanceof ValidationError ? error.message : 'Invalid message format',
          originalMessage: message,
        });
      }
    });

    // Handle editing start
    socket.on('note:editing:start', (message: WSMessage) => {
      try {
        validateWSMessage(message);
        const { noteId, userId } = message.payload;
        const note = stateManager.getNote(noteId);

        if (note) {
          // Update note editing state
          stateManager.updateNote(noteId, { editingBy: userId });
          
          // Broadcast to all clients in the board room
          io.to(`board:${note.boardId}`).emit('note:editing:started', {
            type: 'note:editing:started',
            payload: { noteId, userId },
            timestamp: Date.now(),
            userId: message.userId,
          });
        }
      } catch (error) {
        logger.error(error as Error, 'note:editing:start');
      }
    });

    // Handle editing end
    socket.on('note:editing:end', (message: WSMessage) => {
      try {
        validateWSMessage(message);
        const { noteId } = message.payload;
        const note = stateManager.getNote(noteId);

        if (note) {
          // Clear note editing state
          stateManager.updateNote(noteId, { editingBy: undefined });
          
          // Broadcast to all clients in the board room
          io.to(`board:${note.boardId}`).emit('note:editing:ended', {
            type: 'note:editing:ended',
            payload: { noteId },
            timestamp: Date.now(),
            userId: message.userId,
          });
        }
      } catch (error) {
        logger.error(error as Error, 'note:editing:end');
      }
    });

    // Handle board creation (broadcast only - board already created via REST)
    socket.on('board:create', (message: WSMessage) => {
      try {
        validateWSMessage(message);
        validateCreateBoardPayload(message.payload);

        const payload = message.payload as CreateBoardPayload;
        const board = stateManager.getBoard(payload.boardId);

        if (board) {
          // Broadcast existing board to other clients (not sender)
          socket.broadcast.emit('board:created', {
            type: 'board:created',
            payload: board,
            timestamp: Date.now(),
            userId: message.userId,
          });
        } else {
          socket.emit('error', {
            message: 'Board not found',
            originalMessage: message,
          });
        }
      } catch (error) {
        logger.error(error as Error, 'board:create');
        socket.emit('error', {
          message: error instanceof ValidationError ? error.message : 'Invalid message format',
          originalMessage: message,
        });
      }
    });

    // Handle board deletion (broadcast only - board already deleted via REST)
    socket.on('board:delete', (message: WSMessage) => {
      try {
        validateWSMessage(message);
        validateDeleteBoardPayload(message.payload);

        const payload = message.payload as DeleteBoardPayload;
        
        // Broadcast to other clients (not sender - they already deleted locally)
        socket.broadcast.emit('board:deleted', {
          type: 'board:deleted',
          payload: { boardId: payload.boardId },
          timestamp: Date.now(),
          userId: message.userId,
        });
      } catch (error) {
        logger.error(error as Error, 'board:delete');
        socket.emit('error', {
          message: error instanceof ValidationError ? error.message : 'Invalid message format',
          originalMessage: message,
        });
      }
    });

    // Handle board rename
    socket.on('board:rename', (message: WSMessage) => {
      try {
        validateWSMessage(message);
        validateRenameBoardPayload(message.payload);

        const payload = message.payload as RenameBoardPayload;
        const board = stateManager.renameBoard(payload.boardId, payload.name);

        if (board) {
          // Broadcast to all connected clients
          io.emit('board:renamed', {
            type: 'board:renamed',
            payload: board,
            timestamp: Date.now(),
            userId: message.userId,
          });
        } else {
          socket.emit('error', {
            message: 'Board not found',
            originalMessage: message,
          });
        }
      } catch (error) {
        logger.error(error as Error, 'board:rename');
        socket.emit('error', {
          message: error instanceof ValidationError ? error.message : 'Invalid message format',
          originalMessage: message,
        });
      }
    });

    // Handle sync request (for reconnection)
    socket.on('sync:request', (message: WSMessage) => {
      try {
        validateWSMessage(message);
        validateSyncRequestPayload(message.payload);

        const payload = message.payload as SyncRequestPayload;
        const board = stateManager.getBoard(payload.boardId);

        if (board) {
          // Send sync response only to requesting client
          socket.emit('sync:response', {
            type: 'sync:response',
            payload: { board },
            timestamp: Date.now(),
            userId: message.userId,
          });
        } else {
          socket.emit('error', {
            message: 'Board not found',
            originalMessage: message,
          });
        }
      } catch (error) {
        logger.error(error as Error, 'sync:request');
        socket.emit('error', {
          message: error instanceof ValidationError ? error.message : 'Invalid message format',
          originalMessage: message,
        });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`, 'WebSocket');
    });
  });

  logger.info('WebSocket handlers initialized', 'WebSocket');
}
