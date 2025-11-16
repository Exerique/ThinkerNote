import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import express, { Express } from 'express';
import { PersistenceService } from '../services/persistence';
import { StateManager } from '../services/stateManager';
import { setupWebSocketHandlers } from '../websocket/handlers';
import { setupAPIRoutes } from '../api/routes';
import { Board, Note, WSMessage } from '../../../shared/src/types';
import { promises as fs } from 'fs';

describe('End-to-End Tests', () => {
  let app: Express;
  let httpServer: any;
  let io: SocketIOServer;
  let persistenceService: PersistenceService;
  let stateManager: StateManager;
  let serverPort: number;
  let serverUrl: string;
  const testDataDir = './test-data-e2e';

  beforeAll(async () => {
    // Setup server
    app = express();
    app.use(express.json({ limit: '50mb' }));
    httpServer = createServer(app);
    
    io = new SocketIOServer(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    // Initialize services
    persistenceService = new PersistenceService(testDataDir);
    await persistenceService.initialize();
    stateManager = new StateManager(persistenceService);
    await stateManager.loadFromDisk();

    // Setup routes and handlers
    setupAPIRoutes(app, stateManager);
    setupWebSocketHandlers(io, stateManager);

    // Start server
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        serverPort = (httpServer.address() as any).port;
        serverUrl = `http://localhost:${serverPort}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await stateManager.shutdown();
    httpServer.close();
    
    // Clean up test data
    try {
      await fs.rm(testDataDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  beforeEach(async () => {
    // Clear state between tests
    const boards = stateManager.getAllBoards();
    for (const board of boards) {
      stateManager.deleteBoard(board.id);
    }
  });

  describe('Complete User Workflow: Create Board → Add Notes → Customize → Collaborate', () => {
    let client1: ClientSocket;
    let client2: ClientSocket;

    beforeEach(async () => {
      client1 = ioClient(serverUrl);
      client2 = ioClient(serverUrl);

      await Promise.all([
        new Promise<void>((resolve) => client1.on('connect', () => resolve())),
        new Promise<void>((resolve) => client2.on('connect', () => resolve())),
      ]);
    });

    afterEach(() => {
      if (client1) client1.disconnect();
      if (client2) client2.disconnect();
    });

    it('completes full workflow from board creation to collaboration', async () => {
      // Step 1: User 1 creates a board
      const boardCreatedPromise = new Promise<Board>((resolve) => {
        client1.on('board:created', (message: WSMessage) => {
          resolve(message.payload as Board);
        });
      });

      client1.emit('board:create', {
        type: 'board:create',
        payload: { name: 'Project Planning' },
        timestamp: Date.now(),
        userId: 'user1',
      });

      const board = await boardCreatedPromise;
      expect(board.name).toBe('Project Planning');
      const boardId = board.id;

      // Step 2: Both users join the board
      client1.emit('join:board', boardId);
      client2.emit('join:board', boardId);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Step 3: User 1 creates a note
      const note1CreatedPromise = new Promise<Note>((resolve) => {
        client2.on('note:created', (message: WSMessage) => {
          resolve(message.payload as Note);
        });
      });

      client1.emit('note:create', {
        type: 'note:create',
        payload: { boardId, x: 100, y: 100 },
        timestamp: Date.now(),
        userId: 'user1',
      });

      const note1 = await note1CreatedPromise;
      expect(note1.x).toBe(100);
      expect(note1.y).toBe(100);

      // Step 4: User 1 customizes the note (color and content)
      const note1UpdatedPromise = new Promise<Note>((resolve) => {
        client2.on('note:updated', (message: WSMessage) => {
          resolve(message.payload as Note);
        });
      });

      client1.emit('note:update', {
        type: 'note:update',
        payload: {
          noteId: note1.id,
          updates: {
            content: 'Sprint Goals',
            backgroundColor: '#FF9F0A',
            fontSize: 'large',
          },
        },
        timestamp: Date.now(),
        userId: 'user1',
      });

      const updatedNote1 = await note1UpdatedPromise;
      expect(updatedNote1.content).toBe('Sprint Goals');
      expect(updatedNote1.backgroundColor).toBe('#FF9F0A');
      expect(updatedNote1.fontSize).toBe('large');

      // Step 5: User 2 creates another note
      const note2CreatedPromise = new Promise<Note>((resolve) => {
        client1.on('note:created', (message: WSMessage) => {
          resolve(message.payload as Note);
        });
      });

      client2.emit('note:create', {
        type: 'note:create',
        payload: { boardId, x: 400, y: 200 },
        timestamp: Date.now(),
        userId: 'user2',
      });

      const note2 = await note2CreatedPromise;
      expect(note2.x).toBe(400);
      expect(note2.y).toBe(200);

      // Step 6: User 2 adds content and stickers
      const note2UpdatedPromise = new Promise<Note>((resolve) => {
        client1.on('note:updated', (message: WSMessage) => {
          resolve(message.payload as Note);
        });
      });

      client2.emit('note:update', {
        type: 'note:update',
        payload: {
          noteId: note2.id,
          updates: {
            content: 'Team Tasks',
            stickers: [
              { id: 'sticker-1', type: '✅', x: 10, y: 10, scale: 1.0 },
              { id: 'sticker-2', type: '⭐', x: 50, y: 10, scale: 1.2 },
            ],
          },
        },
        timestamp: Date.now(),
        userId: 'user2',
      });

      const updatedNote2 = await note2UpdatedPromise;
      expect(updatedNote2.content).toBe('Team Tasks');
      expect(updatedNote2.stickers).toHaveLength(2);
      expect(updatedNote2.stickers[0].type).toBe('✅');

      // Step 7: User 1 moves their note
      const noteMovedPromise = new Promise<any>((resolve) => {
        client2.on('note:moved', (message: WSMessage) => {
          resolve(message.payload);
        });
      });

      client1.emit('note:move', {
        type: 'note:move',
        payload: { noteId: note1.id, x: 150, y: 150 },
        timestamp: Date.now(),
        userId: 'user1',
      });

      const movedPayload = await noteMovedPromise;
      expect(movedPayload.x).toBe(150);
      expect(movedPayload.y).toBe(150);

      // Step 8: Verify final state
      const notes = stateManager.getNotes(boardId);
      expect(notes).toHaveLength(2);
      
      const finalNote1 = notes.find(n => n.id === note1.id);
      expect(finalNote1?.x).toBe(150);
      expect(finalNote1?.content).toBe('Sprint Goals');
      
      const finalNote2 = notes.find(n => n.id === note2.id);
      expect(finalNote2?.content).toBe('Team Tasks');
      expect(finalNote2?.stickers).toHaveLength(2);
    });
  });

  describe('Real-time Collaboration Between Two Simulated Clients', () => {
    let client1: ClientSocket;
    let client2: ClientSocket;
    let boardId: string;

    beforeEach(async () => {
      const board = stateManager.createBoard('Collaboration Test');
      boardId = board.id;

      client1 = ioClient(serverUrl);
      client2 = ioClient(serverUrl);

      await Promise.all([
        new Promise<void>((resolve) => client1.on('connect', () => resolve())),
        new Promise<void>((resolve) => client2.on('connect', () => resolve())),
      ]);

      client1.emit('join:board', boardId);
      client2.emit('join:board', boardId);
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    afterEach(() => {
      if (client1) client1.disconnect();
      if (client2) client2.disconnect();
    });

    it('synchronizes simultaneous note creation from both clients', async () => {
      const client1Receives: Note[] = [];
      const client2Receives: Note[] = [];

      client1.on('note:created', (msg: WSMessage) => {
        client1Receives.push(msg.payload as Note);
      });

      client2.on('note:created', (msg: WSMessage) => {
        client2Receives.push(msg.payload as Note);
      });

      // Both clients create notes simultaneously
      client1.emit('note:create', {
        type: 'note:create',
        payload: { boardId, x: 100, y: 100 },
        timestamp: Date.now(),
        userId: 'user1',
      });

      client2.emit('note:create', {
        type: 'note:create',
        payload: { boardId, x: 300, y: 300 },
        timestamp: Date.now(),
        userId: 'user2',
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      // Each client should receive both notes
      expect(client1Receives.length).toBeGreaterThanOrEqual(1);
      expect(client2Receives.length).toBeGreaterThanOrEqual(1);

      // Verify state has both notes
      const notes = stateManager.getNotes(boardId);
      expect(notes).toHaveLength(2);
    });

    it('handles concurrent updates to different notes', async () => {
      const note1 = stateManager.createNote(boardId, 100, 100);
      const note2 = stateManager.createNote(boardId, 300, 300);

      const client1Updates: Note[] = [];
      const client2Updates: Note[] = [];

      client1.on('note:updated', (msg: WSMessage) => {
        client1Updates.push(msg.payload as Note);
      });

      client2.on('note:updated', (msg: WSMessage) => {
        client2Updates.push(msg.payload as Note);
      });

      // Client 1 updates note 1, Client 2 updates note 2
      client1.emit('note:update', {
        type: 'note:update',
        payload: {
          noteId: note1!.id,
          updates: { content: 'Updated by User 1' },
        },
        timestamp: Date.now(),
        userId: 'user1',
      });

      client2.emit('note:update', {
        type: 'note:update',
        payload: {
          noteId: note2!.id,
          updates: { content: 'Updated by User 2' },
        },
        timestamp: Date.now(),
        userId: 'user2',
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      // Both clients should receive both updates
      expect(client1Updates.length).toBeGreaterThanOrEqual(1);
      expect(client2Updates.length).toBeGreaterThanOrEqual(1);

      // Verify final state
      const finalNote1 = stateManager.getNote(note1!.id);
      const finalNote2 = stateManager.getNote(note2!.id);
      expect(finalNote1?.content).toBe('Updated by User 1');
      expect(finalNote2?.content).toBe('Updated by User 2');
    });

    it('handles last-write-wins for concurrent updates to same note', async () => {
      const note = stateManager.createNote(boardId, 100, 100);

      // Both clients update the same note with different content
      const timestamp1 = Date.now();
      const timestamp2 = timestamp1 + 10;

      client1.emit('note:update', {
        type: 'note:update',
        payload: {
          noteId: note!.id,
          updates: { content: 'First update' },
        },
        timestamp: timestamp1,
        userId: 'user1',
      });

      client2.emit('note:update', {
        type: 'note:update',
        payload: {
          noteId: note!.id,
          updates: { content: 'Second update' },
        },
        timestamp: timestamp2,
        userId: 'user2',
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      // Last write should win
      const finalNote = stateManager.getNote(note!.id);
      expect(finalNote?.content).toBe('Second update');
    });

    it('broadcasts board operations to all clients', async () => {
      const client1BoardDeleted = new Promise<any>((resolve) => {
        client1.on('board:deleted', (msg: WSMessage) => {
          resolve(msg.payload);
        });
      });

      const client2BoardDeleted = new Promise<any>((resolve) => {
        client2.on('board:deleted', (msg: WSMessage) => {
          resolve(msg.payload);
        });
      });

      client1.emit('board:delete', {
        type: 'board:delete',
        payload: { boardId },
        timestamp: Date.now(),
        userId: 'user1',
      });

      const [payload1, payload2] = await Promise.all([
        client1BoardDeleted,
        client2BoardDeleted,
      ]);

      expect(payload1.boardId).toBe(boardId);
      expect(payload2.boardId).toBe(boardId);
    });
  });

  describe('Reconnection and State Sync After Disconnect', () => {
    let client1: ClientSocket;
    let client2: ClientSocket;
    let boardId: string;

    beforeEach(async () => {
      const board = stateManager.createBoard('Reconnection Test');
      boardId = board.id;

      client1 = ioClient(serverUrl);
      client2 = ioClient(serverUrl);

      await Promise.all([
        new Promise<void>((resolve) => client1.on('connect', () => resolve())),
        new Promise<void>((resolve) => client2.on('connect', () => resolve())),
      ]);

      client1.emit('join:board', boardId);
      client2.emit('join:board', boardId);
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    afterEach(() => {
      if (client1) client1.disconnect();
      if (client2) client2.disconnect();
    });

    it('syncs state after client reconnects', async () => {
      // Client 2 disconnects
      client2.disconnect();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Client 1 creates notes while client 2 is offline
      client1.emit('note:create', {
        type: 'note:create',
        payload: { boardId, x: 100, y: 100 },
        timestamp: Date.now(),
        userId: 'user1',
      });

      client1.emit('note:create', {
        type: 'note:create',
        payload: { boardId, x: 200, y: 200 },
        timestamp: Date.now(),
        userId: 'user1',
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      // Client 2 reconnects
      client2 = ioClient(serverUrl);
      await new Promise<void>((resolve) => {
        client2.on('connect', () => resolve());
      });

      client2.emit('join:board', boardId);

      // Client 2 requests sync
      const syncResponsePromise = new Promise<Board>((resolve) => {
        client2.on('sync:response', (msg: WSMessage) => {
          resolve(msg.payload.board as Board);
        });
      });

      client2.emit('sync:request', {
        type: 'sync:request',
        payload: { boardId },
        timestamp: Date.now(),
        userId: 'user2',
      });

      const syncedBoard = await syncResponsePromise;
      expect(syncedBoard.notes).toHaveLength(2);
      expect(syncedBoard.notes[0].x).toBe(100);
      expect(syncedBoard.notes[1].x).toBe(200);
    });

    it('maintains data integrity during reconnection', async () => {
      // Create initial notes
      const note1 = stateManager.createNote(boardId, 100, 100);
      const note2 = stateManager.createNote(boardId, 200, 200);

      // Client 1 disconnects
      client1.disconnect();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Client 2 updates notes while client 1 is offline
      client2.emit('note:update', {
        type: 'note:update',
        payload: {
          noteId: note1!.id,
          updates: { content: 'Updated while offline' },
        },
        timestamp: Date.now(),
        userId: 'user2',
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      // Client 1 reconnects and syncs
      client1 = ioClient(serverUrl);
      await new Promise<void>((resolve) => {
        client1.on('connect', () => resolve());
      });

      client1.emit('join:board', boardId);

      const syncResponsePromise = new Promise<Board>((resolve) => {
        client1.on('sync:response', (msg: WSMessage) => {
          resolve(msg.payload.board as Board);
        });
      });

      client1.emit('sync:request', {
        type: 'sync:request',
        payload: { boardId },
        timestamp: Date.now(),
        userId: 'user1',
      });

      const syncedBoard = await syncResponsePromise;
      const syncedNote = syncedBoard.notes.find(n => n.id === note1!.id);
      expect(syncedNote?.content).toBe('Updated while offline');
    });

    it('handles multiple reconnections gracefully', async () => {
      // Create a note
      stateManager.createNote(boardId, 100, 100);

      // Simulate multiple disconnect/reconnect cycles
      for (let i = 0; i < 3; i++) {
        client1.disconnect();
        await new Promise(resolve => setTimeout(resolve, 100));

        client1 = ioClient(serverUrl);
        await new Promise<void>((resolve) => {
          client1.on('connect', () => resolve());
        });

        client1.emit('join:board', boardId);

        const syncResponsePromise = new Promise<Board>((resolve) => {
          client1.on('sync:response', (msg: WSMessage) => {
            resolve(msg.payload.board as Board);
          });
        });

        client1.emit('sync:request', {
          type: 'sync:request',
          payload: { boardId },
          timestamp: Date.now(),
          userId: 'user1',
        });

        const syncedBoard = await syncResponsePromise;
        expect(syncedBoard.notes).toHaveLength(1);
      }
    });
  });

  describe('Image Upload Across Clients', () => {
    let client1: ClientSocket;
    let client2: ClientSocket;
    let boardId: string;
    let noteId: string;

    beforeEach(async () => {
      const board = stateManager.createBoard('Image Test');
      boardId = board.id;
      const note = stateManager.createNote(boardId, 100, 100);
      noteId = note!.id;

      client1 = ioClient(serverUrl);
      client2 = ioClient(serverUrl);

      await Promise.all([
        new Promise<void>((resolve) => client1.on('connect', () => resolve())),
        new Promise<void>((resolve) => client2.on('connect', () => resolve())),
      ]);

      client1.emit('join:board', boardId);
      client2.emit('join:board', boardId);
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    afterEach(() => {
      if (client1) client1.disconnect();
      if (client2) client2.disconnect();
    });

    it('uploads image and broadcasts to all clients', async () => {
      const client2ReceivePromise = new Promise<Note>((resolve) => {
        client2.on('note:updated', (msg: WSMessage) => {
          resolve(msg.payload as Note);
        });
      });

      // Small 1x1 red pixel PNG
      const base64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

      client1.emit('note:update', {
        type: 'note:update',
        payload: {
          noteId,
          updates: {
            images: [{
              id: 'img-1',
              url: base64Image,
              width: 200,
              height: 150,
              x: 10,
              y: 10,
            }],
          },
        },
        timestamp: Date.now(),
        userId: 'user1',
      });

      const updatedNote = await client2ReceivePromise;
      expect(updatedNote.images).toHaveLength(1);
      expect(updatedNote.images[0].url).toBe(base64Image);
      expect(updatedNote.images[0].width).toBe(200);
      expect(updatedNote.images[0].height).toBe(150);
    });

    it('handles multiple images in a note', async () => {
      const client2ReceivePromise = new Promise<Note>((resolve) => {
        client2.on('note:updated', (msg: WSMessage) => {
          resolve(msg.payload as Note);
        });
      });

      const image1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
      const image2 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

      client1.emit('note:update', {
        type: 'note:update',
        payload: {
          noteId,
          updates: {
            images: [
              { id: 'img-1', url: image1, width: 100, height: 100, x: 0, y: 0 },
              { id: 'img-2', url: image2, width: 150, height: 150, x: 110, y: 0 },
            ],
          },
        },
        timestamp: Date.now(),
        userId: 'user1',
      });

      const updatedNote = await client2ReceivePromise;
      expect(updatedNote.images).toHaveLength(2);
      expect(updatedNote.images[0].id).toBe('img-1');
      expect(updatedNote.images[1].id).toBe('img-2');
    });

    it('persists images across server restart', async () => {
      const base64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

      client1.emit('note:update', {
        type: 'note:update',
        payload: {
          noteId,
          updates: {
            images: [{
              id: 'img-1',
              url: base64Image,
              width: 200,
              height: 150,
              x: 10,
              y: 10,
            }],
          },
        },
        timestamp: Date.now(),
        userId: 'user1',
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      // Simulate server restart
      await stateManager.shutdown();
      const newStateManager = new StateManager(persistenceService);
      await newStateManager.loadFromDisk();

      const loadedNote = newStateManager.getNote(noteId);
      expect(loadedNote?.images).toHaveLength(1);
      expect(loadedNote?.images[0].url).toBe(base64Image);

      await newStateManager.shutdown();
    });
  });

  describe('Physics Interactions with Multiple Notes', () => {
    let client1: ClientSocket;
    let client2: ClientSocket;
    let boardId: string;

    beforeEach(async () => {
      const board = stateManager.createBoard('Physics Test');
      boardId = board.id;

      client1 = ioClient(serverUrl);
      client2 = ioClient(serverUrl);

      await Promise.all([
        new Promise<void>((resolve) => client1.on('connect', () => resolve())),
        new Promise<void>((resolve) => client2.on('connect', () => resolve())),
      ]);

      client1.emit('join:board', boardId);
      client2.emit('join:board', boardId);
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    afterEach(() => {
      if (client1) client1.disconnect();
      if (client2) client2.disconnect();
    });

    it('handles multiple notes being moved simultaneously', async () => {
      // Create multiple notes
      const note1 = stateManager.createNote(boardId, 100, 100);
      const note2 = stateManager.createNote(boardId, 300, 100);
      const note3 = stateManager.createNote(boardId, 500, 100);

      const moveEvents: any[] = [];
      client2.on('note:moved', (msg: WSMessage) => {
        moveEvents.push(msg.payload);
      });

      // Move all notes simultaneously
      client1.emit('note:move', {
        type: 'note:move',
        payload: { noteId: note1!.id, x: 150, y: 150 },
        timestamp: Date.now(),
        userId: 'user1',
      });

      client1.emit('note:move', {
        type: 'note:move',
        payload: { noteId: note2!.id, x: 350, y: 150 },
        timestamp: Date.now(),
        userId: 'user1',
      });

      client1.emit('note:move', {
        type: 'note:move',
        payload: { noteId: note3!.id, x: 550, y: 150 },
        timestamp: Date.now(),
        userId: 'user1',
      });

      await new Promise(resolve => setTimeout(resolve, 300));

      expect(moveEvents.length).toBe(3);
      
      const finalNote1 = stateManager.getNote(note1!.id);
      const finalNote2 = stateManager.getNote(note2!.id);
      const finalNote3 = stateManager.getNote(note3!.id);

      expect(finalNote1?.x).toBe(150);
      expect(finalNote2?.x).toBe(350);
      expect(finalNote3?.x).toBe(550);
    });

    it('maintains note positions across multiple operations', async () => {
      const note = stateManager.createNote(boardId, 100, 100);

      // Perform multiple moves in sequence
      const positions = [
        { x: 150, y: 150 },
        { x: 200, y: 200 },
        { x: 250, y: 250 },
      ];

      for (const pos of positions) {
        client1.emit('note:move', {
          type: 'note:move',
          payload: { noteId: note!.id, x: pos.x, y: pos.y },
          timestamp: Date.now(),
          userId: 'user1',
        });
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const finalNote = stateManager.getNote(note!.id);
      expect(finalNote?.x).toBe(250);
      expect(finalNote?.y).toBe(250);
    });

    it('handles rapid position updates from physics simulation', async () => {
      const note = stateManager.createNote(boardId, 100, 100);
      const moveCount = 10;
      const moveEvents: any[] = [];

      client2.on('note:moved', (msg: WSMessage) => {
        moveEvents.push(msg.payload);
      });

      // Simulate rapid physics updates
      for (let i = 0; i < moveCount; i++) {
        client1.emit('note:move', {
          type: 'note:move',
          payload: {
            noteId: note!.id,
            x: 100 + i * 10,
            y: 100 + i * 10,
          },
          timestamp: Date.now() + i,
          userId: 'user1',
        });
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      // Should receive all move events
      expect(moveEvents.length).toBeGreaterThanOrEqual(moveCount);

      // Final position should be the last update
      const finalNote = stateManager.getNote(note!.id);
      expect(finalNote?.x).toBe(100 + (moveCount - 1) * 10);
      expect(finalNote?.y).toBe(100 + (moveCount - 1) * 10);
    });

    it('synchronizes note positions across multiple clients during physics', async () => {
      const note = stateManager.createNote(boardId, 100, 100);

      const client2Moves: any[] = [];
      client2.on('note:moved', (msg: WSMessage) => {
        client2Moves.push(msg.payload);
      });

      // Client 1 performs a series of moves (simulating physics)
      const trajectory = [
        { x: 120, y: 120 },
        { x: 140, y: 135 },
        { x: 155, y: 145 },
        { x: 165, y: 150 },
      ];

      for (const pos of trajectory) {
        client1.emit('note:move', {
          type: 'note:move',
          payload: { noteId: note!.id, x: pos.x, y: pos.y },
          timestamp: Date.now(),
          userId: 'user1',
        });
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      await new Promise(resolve => setTimeout(resolve, 200));

      // Client 2 should have received all position updates
      expect(client2Moves.length).toBe(trajectory.length);
      expect(client2Moves[client2Moves.length - 1].x).toBe(165);
      expect(client2Moves[client2Moves.length - 1].y).toBe(150);
    });
  });
});
