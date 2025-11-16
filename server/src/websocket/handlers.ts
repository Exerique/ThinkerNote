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
          // Send just the note as payload - client will wrap it in WSMessage
          io.to(`board:${payload.boardId}`).emit('note:created', note);
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
          // Send just the note as payload - client will wrap it in WSMessage
          io.to(`board:${note.boardId}`).emit('note:updated', note);
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
            // Send just the payload - client will wrap it in WSMessage
            io.to(`board:${boardId}`).emit('note:deleted', { noteId: payload.noteId });
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
          // Send just the payload - client will wrap it in WSMessage
          io.to(`board:${note.boardId}`).emit('note:moved', {
            noteId: note.id,
            x: note.x,
            y: note.y,
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

    // Handle board creation
    socket.on('board:create', (message: WSMessage) => {
      try {
        validateWSMessage(message);
        validateCreateBoardPayload(message.payload);

        const payload = message.payload as CreateBoardPayload;
        const board = stateManager.createBoard(payload.name);

        // Broadcast to all connected clients
        // Send just the board as payload - client will wrap it in WSMessage
        io.emit('board:created', board);
      } catch (error) {
        logger.error(error as Error, 'board:create');
        socket.emit('error', {
          message: error instanceof ValidationError ? error.message : 'Invalid message format',
          originalMessage: message,
        });
      }
    });

    // Handle board deletion
    socket.on('board:delete', (message: WSMessage) => {
      try {
        validateWSMessage(message);
        validateDeleteBoardPayload(message.payload);

        const payload = message.payload as DeleteBoardPayload;
        const success = stateManager.deleteBoard(payload.boardId);

        if (success) {
          // Broadcast to all connected clients
          // Send just the payload - client will wrap it in WSMessage
          io.emit('board:deleted', { boardId: payload.boardId });
        } else {
          socket.emit('error', {
            message: 'Board not found',
            originalMessage: message,
          });
        }
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
          // Send just the board as payload - client will wrap it in WSMessage
          io.emit('board:renamed', board);
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
          // Send just the payload - client will wrap it in WSMessage
          socket.emit('sync:response', { board });
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
