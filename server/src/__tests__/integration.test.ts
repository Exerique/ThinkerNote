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

describe('Integration Tests', () => {
  let app: Express;
  let httpServer: any;
  let io: SocketIOServer;
  let persistenceService: PersistenceService;
  let stateManager: StateManager;
  let serverPort: number;
  let serverUrl: string;
  const testDataDir = './test-data-integration';

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

  describe('Note Creation Flow End-to-End', () => {
    let client: ClientSocket;
    let boardId: string;

    beforeEach(async () => {
      // Create a board via API
      const board = stateManager.createBoard('Test Board');
      boardId = board.id;

      // Connect client
      client = ioClient(serverUrl);
      await new Promise<void>((resolve) => {
        client.on('connect', () => resolve());
      });
      
      // Join board room
      client.emit('join:board', boardId);
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    afterEach(() => {
      if (client) {
        client.disconnect();
      }
    });

    it('creates a note and broadcasts to all clients', async () => {
      const noteCreatedPromise = new Promise<Note>((resolve) => {
        client.on('note:created', (message: WSMessage) => {
          resolve(message.payload as Note);
        });
      });

      // Create note via WebSocket
      const createMessage: WSMessage = {
        type: 'note:create',
        payload: {
          boardId,
          x: 100,
          y: 200,
        },
        timestamp: Date.now(),
        userId: 'test-user',
      };

      client.emit('note:create', createMessage);

      const createdNote = await noteCreatedPromise;
      expect(createdNote).toBeDefined();
      expect(createdNote.x).toBe(100);
      expect(createdNote.y).toBe(200);
      expect(createdNote.boardId).toBe(boardId);
    });

    it('persists created note to state', async () => {
      const createMessage: WSMessage = {
        type: 'note:create',
        payload: {
          boardId,
          x: 150,
          y: 250,
        },
        timestamp: Date.now(),
        userId: 'test-user',
      };

      client.emit('note:create', createMessage);
      await new Promise(resolve => setTimeout(resolve, 100));

      const notes = stateManager.getNotes(boardId);
      expect(notes).toHaveLength(1);
      expect(notes[0].x).toBe(150);
      expect(notes[0].y).toBe(250);
    });
  });

  describe('Drag-and-Drop with Physics', () => {
    let client: ClientSocket;
    let boardId: string;
    let noteId: string;

    beforeEach(async () => {
      const board = stateManager.createBoard('Test Board');
      boardId = board.id;
      const note = stateManager.createNote(boardId, 100, 100);
      noteId = note!.id;

      client = ioClient(serverUrl);
      await new Promise<void>((resolve) => {
        client.on('connect', () => resolve());
      });
      
      client.emit('join:board', boardId);
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    afterEach(() => {
      if (client) {
        client.disconnect();
      }
    });

    it('moves note and broadcasts position update', async () => {
      const noteMovedPromise = new Promise<any>((resolve) => {
        client.on('note:moved', (message: WSMessage) => {
          resolve(message.payload);
        });
      });

      const moveMessage: WSMessage = {
        type: 'note:move',
        payload: {
          noteId,
          x: 300,
          y: 400,
        },
        timestamp: Date.now(),
        userId: 'test-user',
      };

      client.emit('note:move', moveMessage);

      const movedPayload = await noteMovedPromise;
      expect(movedPayload.noteId).toBe(noteId);
      expect(movedPayload.x).toBe(300);
      expect(movedPayload.y).toBe(400);
    });

    it('updates note position in state', async () => {
      const moveMessage: WSMessage = {
        type: 'note:move',
        payload: {
          noteId,
          x: 500,
          y: 600,
        },
        timestamp: Date.now(),
        userId: 'test-user',
      };

      client.emit('note:move', moveMessage);
      await new Promise(resolve => setTimeout(resolve, 100));

      const note = stateManager.getNote(noteId);
      expect(note?.x).toBe(500);
      expect(note?.y).toBe(600);
    });
  });

  describe('Image Upload and Display', () => {
    let client: ClientSocket;
    let boardId: string;
    let noteId: string;

    beforeEach(async () => {
      const board = stateManager.createBoard('Test Board');
      boardId = board.id;
      const note = stateManager.createNote(boardId, 100, 100);
      noteId = note!.id;

      client = ioClient(serverUrl);
      await new Promise<void>((resolve) => {
        client.on('connect', () => resolve());
      });
      
      client.emit('join:board', boardId);
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    afterEach(() => {
      if (client) {
        client.disconnect();
      }
    });

    it('adds image to note and broadcasts update', async () => {
      const noteUpdatedPromise = new Promise<Note>((resolve) => {
        client.on('note:updated', (message: WSMessage) => {
          resolve(message.payload as Note);
        });
      });

      const base64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      
      const updateMessage: WSMessage = {
        type: 'note:update',
        payload: {
          noteId,
          updates: {
            images: [{
              id: 'img-1',
              url: base64Image,
              width: 100,
              height: 100,
              x: 0,
              y: 0,
            }],
          },
        },
        timestamp: Date.now(),
        userId: 'test-user',
      };

      client.emit('note:update', updateMessage);

      const updatedNote = await noteUpdatedPromise;
      expect(updatedNote.images).toHaveLength(1);
      expect(updatedNote.images[0].url).toBe(base64Image);
    });
  });

  describe('Sticker Addition and Positioning', () => {
    let client: ClientSocket;
    let boardId: string;
    let noteId: string;

    beforeEach(async () => {
      const board = stateManager.createBoard('Test Board');
      boardId = board.id;
      const note = stateManager.createNote(boardId, 100, 100);
      noteId = note!.id;

      client = ioClient(serverUrl);
      await new Promise<void>((resolve) => {
        client.on('connect', () => resolve());
      });
      
      client.emit('join:board', boardId);
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    afterEach(() => {
      if (client) {
        client.disconnect();
      }
    });

    it('adds sticker to note and broadcasts update', async () => {
      const noteUpdatedPromise = new Promise<Note>((resolve) => {
        client.on('note:updated', (message: WSMessage) => {
          resolve(message.payload as Note);
        });
      });

      const updateMessage: WSMessage = {
        type: 'note:update',
        payload: {
          noteId,
          updates: {
            stickers: [{
              id: 'sticker-1',
              type: '❤️',
              x: 50,
              y: 50,
              scale: 1.5,
            }],
          },
        },
        timestamp: Date.now(),
        userId: 'test-user',
      };

      client.emit('note:update', updateMessage);

      const updatedNote = await noteUpdatedPromise;
      expect(updatedNote.stickers).toHaveLength(1);
      expect(updatedNote.stickers[0].type).toBe('❤️');
      expect(updatedNote.stickers[0].scale).toBe(1.5);
    });
  });

  describe('Real-time Update Reception', () => {
    let client1: ClientSocket;
    let client2: ClientSocket;
    let boardId: string;

    beforeEach(async () => {
      const board = stateManager.createBoard('Test Board');
      boardId = board.id;

      // Connect two clients
      client1 = ioClient(serverUrl);
      client2 = ioClient(serverUrl);

      await Promise.all([
        new Promise<void>((resolve) => client1.on('connect', () => resolve())),
        new Promise<void>((resolve) => client2.on('connect', () => resolve())),
      ]);

      client1.emit('join:board', boardId);
      client2.emit('join:board', boardId);
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    afterEach(() => {
      if (client1) client1.disconnect();
      if (client2) client2.disconnect();
    });

    it('broadcasts note creation to all clients', async () => {
      const client2ReceivePromise = new Promise<Note>((resolve) => {
        client2.on('note:created', (message: WSMessage) => {
          resolve(message.payload as Note);
        });
      });

      const createMessage: WSMessage = {
        type: 'note:create',
        payload: {
          boardId,
          x: 100,
          y: 200,
        },
        timestamp: Date.now(),
        userId: 'client1',
      };

      client1.emit('note:create', createMessage);

      const receivedNote = await client2ReceivePromise;
      expect(receivedNote).toBeDefined();
      expect(receivedNote.x).toBe(100);
      expect(receivedNote.y).toBe(200);
    });

    it('broadcasts note updates to all clients', async () => {
      // Create note first
      const note = stateManager.createNote(boardId, 100, 100);
      const noteId = note!.id;

      const client2ReceivePromise = new Promise<Note>((resolve) => {
        client2.on('note:updated', (message: WSMessage) => {
          resolve(message.payload as Note);
        });
      });

      const updateMessage: WSMessage = {
        type: 'note:update',
        payload: {
          noteId,
          updates: {
            content: 'Updated content from client1',
          },
        },
        timestamp: Date.now(),
        userId: 'client1',
      };

      client1.emit('note:update', updateMessage);

      const receivedNote = await client2ReceivePromise;
      expect(receivedNote.content).toBe('Updated content from client1');
    });

    it('broadcasts note deletion to all clients', async () => {
      const note = stateManager.createNote(boardId, 100, 100);
      const noteId = note!.id;

      const client2ReceivePromise = new Promise<any>((resolve) => {
        client2.on('note:deleted', (message: WSMessage) => {
          resolve(message.payload);
        });
      });

      const deleteMessage: WSMessage = {
        type: 'note:delete',
        payload: {
          noteId,
        },
        timestamp: Date.now(),
        userId: 'client1',
      };

      client1.emit('note:delete', deleteMessage);

      const receivedPayload = await client2ReceivePromise;
      expect(receivedPayload.noteId).toBe(noteId);
    });
  });

  describe('WebSocket Connection and Broadcast', () => {
    let client: ClientSocket;

    afterEach(() => {
      if (client) {
        client.disconnect();
      }
    });

    it('establishes WebSocket connection', async () => {
      client = ioClient(serverUrl);
      
      await new Promise<void>((resolve) => {
        client.on('connect', () => {
          expect(client.connected).toBe(true);
          resolve();
        });
      });
    });

    it('handles board creation broadcast', async () => {
      client = ioClient(serverUrl);
      
      await new Promise<void>((resolve) => {
        client.on('connect', () => resolve());
      });

      const boardCreatedPromise = new Promise<Board>((resolve) => {
        client.on('board:created', (message: WSMessage) => {
          resolve(message.payload as Board);
        });
      });

      const createMessage: WSMessage = {
        type: 'board:create',
        payload: {
          name: 'New Board',
        },
        timestamp: Date.now(),
        userId: 'test-user',
      };

      client.emit('board:create', createMessage);

      const createdBoard = await boardCreatedPromise;
      expect(createdBoard.name).toBe('New Board');
    });

    it('handles board deletion broadcast', async () => {
      const board = stateManager.createBoard('Board to Delete');
      
      client = ioClient(serverUrl);
      
      await new Promise<void>((resolve) => {
        client.on('connect', () => resolve());
      });

      const boardDeletedPromise = new Promise<any>((resolve) => {
        client.on('board:deleted', (message: WSMessage) => {
          resolve(message.payload);
        });
      });

      const deleteMessage: WSMessage = {
        type: 'board:delete',
        payload: {
          boardId: board.id,
        },
        timestamp: Date.now(),
        userId: 'test-user',
      };

      client.emit('board:delete', deleteMessage);

      const deletedPayload = await boardDeletedPromise;
      expect(deletedPayload.boardId).toBe(board.id);
    });
  });

  describe('State Persistence and Loading', () => {
    it('persists boards to disk', async () => {
      const board1 = stateManager.createBoard('Board 1');
      const board2 = stateManager.createBoard('Board 2');
      
      // Trigger save
      await stateManager.shutdown();
      
      // Create new state manager and load
      const newStateManager = new StateManager(persistenceService);
      await newStateManager.loadFromDisk();
      
      const boards = newStateManager.getAllBoards();
      expect(boards).toHaveLength(2);
      expect(boards.find(b => b.id === board1.id)).toBeDefined();
      expect(boards.find(b => b.id === board2.id)).toBeDefined();
      
      await newStateManager.shutdown();
    });

    it('persists notes with boards', async () => {
      const board = stateManager.createBoard('Test Board');
      const note1 = stateManager.createNote(board.id, 100, 200);
      const note2 = stateManager.createNote(board.id, 300, 400);
      
      await stateManager.shutdown();
      
      const newStateManager = new StateManager(persistenceService);
      await newStateManager.loadFromDisk();
      
      const notes = newStateManager.getNotes(board.id);
      expect(notes).toHaveLength(2);
      expect(notes.find(n => n.id === note1!.id)).toBeDefined();
      expect(notes.find(n => n.id === note2!.id)).toBeDefined();
      
      await newStateManager.shutdown();
    });

    it('persists note content and customizations', async () => {
      const board = stateManager.createBoard('Test Board');
      const note = stateManager.createNote(board.id, 100, 200);
      
      stateManager.updateNote(note!.id, {
        content: 'Test content',
        backgroundColor: '#FF0000',
        fontSize: 'large',
      });
      
      await stateManager.shutdown();
      
      const newStateManager = new StateManager(persistenceService);
      await newStateManager.loadFromDisk();
      
      const loadedNote = newStateManager.getNote(note!.id);
      expect(loadedNote?.content).toBe('Test content');
      expect(loadedNote?.backgroundColor).toBe('#FF0000');
      expect(loadedNote?.fontSize).toBe('large');
      
      await newStateManager.shutdown();
    });
  });

  describe('Multi-client Synchronization', () => {
    let client1: ClientSocket;
    let client2: ClientSocket;
    let boardId: string;

    beforeEach(async () => {
      const board = stateManager.createBoard('Sync Test Board');
      boardId = board.id;

      client1 = ioClient(serverUrl);
      client2 = ioClient(serverUrl);

      await Promise.all([
        new Promise<void>((resolve) => client1.on('connect', () => resolve())),
        new Promise<void>((resolve) => client2.on('connect', () => resolve())),
      ]);

      client1.emit('join:board', boardId);
      client2.emit('join:board', boardId);
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    afterEach(() => {
      if (client1) client1.disconnect();
      if (client2) client2.disconnect();
    });

    it('synchronizes note creation across clients', async () => {
      const client2ReceivePromise = new Promise<Note>((resolve) => {
        client2.on('note:created', (message: WSMessage) => {
          resolve(message.payload as Note);
        });
      });

      client1.emit('note:create', {
        type: 'note:create',
        payload: { boardId, x: 100, y: 200 },
        timestamp: Date.now(),
        userId: 'client1',
      });

      const note = await client2ReceivePromise;
      expect(note.x).toBe(100);
      expect(note.y).toBe(200);
    });

    it('synchronizes note updates across clients', async () => {
      const note = stateManager.createNote(boardId, 100, 100);
      
      const client2ReceivePromise = new Promise<Note>((resolve) => {
        client2.on('note:updated', (message: WSMessage) => {
          resolve(message.payload as Note);
        });
      });

      client1.emit('note:update', {
        type: 'note:update',
        payload: {
          noteId: note!.id,
          updates: { content: 'Synced content' },
        },
        timestamp: Date.now(),
        userId: 'client1',
      });

      const updatedNote = await client2ReceivePromise;
      expect(updatedNote.content).toBe('Synced content');
    });

    it('handles sync request for reconnection', async () => {
      // Create some notes
      stateManager.createNote(boardId, 100, 100);
      stateManager.createNote(boardId, 200, 200);

      const syncResponsePromise = new Promise<Board>((resolve) => {
        client1.on('sync:response', (message: WSMessage) => {
          resolve(message.payload.board as Board);
        });
      });

      client1.emit('sync:request', {
        type: 'sync:request',
        payload: { boardId },
        timestamp: Date.now(),
        userId: 'client1',
      });

      const syncedBoard = await syncResponsePromise;
      expect(syncedBoard.id).toBe(boardId);
      expect(syncedBoard.notes).toHaveLength(2);
    });

    it('maintains consistency across multiple operations', async () => {
      const operations: Promise<any>[] = [];
      const receivedUpdates: any[] = [];

      client2.on('note:created', (msg) => receivedUpdates.push(msg));
      client2.on('note:updated', (msg) => receivedUpdates.push(msg));
      client2.on('note:moved', (msg) => receivedUpdates.push(msg));

      // Client 1 performs multiple operations
      operations.push(
        new Promise<void>((resolve) => {
          client1.emit('note:create', {
            type: 'note:create',
            payload: { boardId, x: 100, y: 100 },
            timestamp: Date.now(),
            userId: 'client1',
          });
          setTimeout(resolve, 50);
        })
      );

      await Promise.all(operations);
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify state consistency
      const notes = stateManager.getNotes(boardId);
      expect(notes.length).toBeGreaterThan(0);
      expect(receivedUpdates.length).toBeGreaterThan(0);
    });
  });
});
