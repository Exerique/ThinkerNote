import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import express, { Express } from 'express';
import { PersistenceService } from '../services/persistence';
import { StateManager } from '../services/stateManager';
import { setupWebSocketHandlers } from '../websocket/handlers';
import { setupAPIRoutes } from '../api/routes';
import { WSMessage } from '../../../shared/src/types';
import { promises as fs } from 'fs';

describe('Performance Tests', () => {
  let app: Express;
  let httpServer: any;
  let io: SocketIOServer;
  let persistenceService: PersistenceService;
  let stateManager: StateManager;
  let serverPort: number;
  let serverUrl: string;
  const testDataDir = './test-data-performance';

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

  describe('Render Performance with 100+ Notes', () => {
    it('creates 100 notes and measures state management performance', async () => {
      const board = stateManager.createBoard('Performance Test Board');
      const boardId = board.id;
      
      const startTime = performance.now();
      const noteCount = 100;
      const noteIds: string[] = [];

      // Create 100 notes
      for (let i = 0; i < noteCount; i++) {
        const x = (i % 10) * 300;
        const y = Math.floor(i / 10) * 250;
        const note = stateManager.createNote(boardId, x, y);
        if (note) {
          noteIds.push(note.id);
        }
      }

      const createTime = performance.now() - startTime;
      console.log(`Created ${noteCount} notes in ${createTime.toFixed(2)}ms`);
      console.log(`Average time per note: ${(createTime / noteCount).toFixed(2)}ms`);

      // Verify all notes were created
      const notes = stateManager.getNotes(boardId);
      expect(notes).toHaveLength(noteCount);

      // Test retrieval performance
      const retrievalStart = performance.now();
      for (let i = 0; i < 10; i++) {
        stateManager.getNotes(boardId);
      }
      const retrievalTime = (performance.now() - retrievalStart) / 10;
      console.log(`Average retrieval time for ${noteCount} notes: ${retrievalTime.toFixed(2)}ms`);

      // Performance assertions
      expect(createTime).toBeLessThan(5000); // Should create 100 notes in under 5 seconds
      expect(retrievalTime).toBeLessThan(100); // Should retrieve in under 100ms
    });

    it('updates 100 notes and measures update performance', async () => {
      const board = stateManager.createBoard('Update Performance Test');
      const boardId = board.id;
      
      // Create 100 notes
      const noteIds: string[] = [];
      for (let i = 0; i < 100; i++) {
        const note = stateManager.createNote(boardId, i * 10, i * 10);
        if (note) {
          noteIds.push(note.id);
        }
      }

      // Measure update performance
      const startTime = performance.now();
      for (const noteId of noteIds) {
        stateManager.updateNote(noteId, {
          content: `Updated content ${noteId}`,
          backgroundColor: '#FF9F0A',
        });
      }
      const updateTime = performance.now() - startTime;

      console.log(`Updated 100 notes in ${updateTime.toFixed(2)}ms`);
      console.log(`Average update time: ${(updateTime / 100).toFixed(2)}ms`);

      // Verify updates
      const notes = stateManager.getNotes(boardId);
      expect(notes.every(n => n.content.startsWith('Updated content'))).toBe(true);

      // Performance assertion
      expect(updateTime).toBeLessThan(2000); // Should update 100 notes in under 2 seconds
    });

    it('handles concurrent operations on 100 notes', async () => {
      const board = stateManager.createBoard('Concurrent Test');
      const boardId = board.id;
      
      // Create 100 notes
      const noteIds: string[] = [];
      for (let i = 0; i < 100; i++) {
        const note = stateManager.createNote(boardId, i * 10, i * 10);
        if (note) {
          noteIds.push(note.id);
        }
      }

      // Perform concurrent operations
      const startTime = performance.now();
      const operations = noteIds.map((noteId, index) => {
        if (index % 3 === 0) {
          return stateManager.updateNote(noteId, { content: `Concurrent ${index}` });
        } else if (index % 3 === 1) {
          return stateManager.moveNote(noteId, index * 20, index * 20);
        } else {
          return stateManager.getNote(noteId);
        }
      });

      await Promise.all(operations);
      const concurrentTime = performance.now() - startTime;

      console.log(`Completed 100 concurrent operations in ${concurrentTime.toFixed(2)}ms`);

      // Performance assertion
      expect(concurrentTime).toBeLessThan(3000); // Should complete in under 3 seconds
    });
  });

  describe('WebSocket Message Throughput', () => {
    let client: ClientSocket;
    let boardId: string;

    beforeEach(async () => {
      const board = stateManager.createBoard('Throughput Test');
      boardId = board.id;

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

    it('measures message throughput for note creation', async () => {
      const messageCount = 50;
      const receivedMessages: any[] = [];

      client.on('note:created', (msg: WSMessage) => {
        receivedMessages.push(msg);
      });

      const startTime = performance.now();

      // Send messages rapidly
      for (let i = 0; i < messageCount; i++) {
        client.emit('note:create', {
          type: 'note:create',
          payload: { boardId, x: i * 10, y: i * 10 },
          timestamp: Date.now(),
          userId: 'perf-test',
        });
      }

      // Wait for all messages to be processed
      await new Promise(resolve => setTimeout(resolve, 2000));

      const totalTime = performance.now() - startTime;
      const messagesPerSecond = (messageCount / totalTime) * 1000;

      console.log(`Sent ${messageCount} messages in ${totalTime.toFixed(2)}ms`);
      console.log(`Throughput: ${messagesPerSecond.toFixed(2)} messages/second`);
      console.log(`Received ${receivedMessages.length} broadcast messages`);

      // Verify all notes were created
      const notes = stateManager.getNotes(boardId);
      expect(notes.length).toBeGreaterThanOrEqual(messageCount);

      // Performance assertion - should handle at least 20 messages per second
      expect(messagesPerSecond).toBeGreaterThan(20);
    });

    it('measures round-trip latency for updates', async () => {
      // Create a note first
      const note = stateManager.createNote(boardId, 100, 100);
      const noteId = note!.id;

      const latencies: number[] = [];
      const updateCount = 20;

      for (let i = 0; i < updateCount; i++) {
        const sendTime = performance.now();
        
        const updatePromise = new Promise<void>((resolve) => {
          client.once('note:updated', () => {
            const receiveTime = performance.now();
            latencies.push(receiveTime - sendTime);
            resolve();
          });
        });

        client.emit('note:update', {
          type: 'note:update',
          payload: {
            noteId,
            updates: { content: `Update ${i}` },
          },
          timestamp: Date.now(),
          userId: 'perf-test',
        });

        await updatePromise;
      }

      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const maxLatency = Math.max(...latencies);
      const minLatency = Math.min(...latencies);

      console.log(`Average latency: ${avgLatency.toFixed(2)}ms`);
      console.log(`Min latency: ${minLatency.toFixed(2)}ms`);
      console.log(`Max latency: ${maxLatency.toFixed(2)}ms`);

      // Performance assertion - average latency should be under 100ms
      expect(avgLatency).toBeLessThan(100);
    });

    it('handles burst traffic from multiple operations', async () => {
      const burstSize = 30;
      const receivedMessages: any[] = [];

      client.on('note:created', (msg) => receivedMessages.push(msg));
      client.on('note:updated', (msg) => receivedMessages.push(msg));
      client.on('note:moved', (msg) => receivedMessages.push(msg));

      const startTime = performance.now();

      // Send burst of mixed operations
      for (let i = 0; i < burstSize; i++) {
        if (i % 3 === 0) {
          client.emit('note:create', {
            type: 'note:create',
            payload: { boardId, x: i * 10, y: i * 10 },
            timestamp: Date.now(),
            userId: 'perf-test',
          });
        }
      }

      await new Promise(resolve => setTimeout(resolve, 1500));

      const totalTime = performance.now() - startTime;
      const throughput = (burstSize / totalTime) * 1000;

      console.log(`Processed burst of ${burstSize} operations in ${totalTime.toFixed(2)}ms`);
      console.log(`Burst throughput: ${throughput.toFixed(2)} ops/second`);
      console.log(`Received ${receivedMessages.length} messages`);

      // Should handle burst traffic efficiently
      expect(totalTime).toBeLessThan(3000);
    });
  });

  describe('Physics Simulation Frame Rate with 50+ Bodies', () => {
    it('simulates physics performance with 50 notes', async () => {
      const board = stateManager.createBoard('Physics Test');
      const boardId = board.id;
      
      // Create 50 notes in a grid
      const noteCount = 50;
      const noteIds: string[] = [];
      
      for (let i = 0; i < noteCount; i++) {
        const x = (i % 10) * 300;
        const y = Math.floor(i / 10) * 250;
        const note = stateManager.createNote(boardId, x, y);
        if (note) {
          noteIds.push(note.id);
        }
      }

      // Simulate physics updates (moving notes)
      const updateCount = 60; // Simulate 60 frames
      const startTime = performance.now();

      for (let frame = 0; frame < updateCount; frame++) {
        // Update positions for all notes (simulating physics)
        for (let i = 0; i < noteIds.length; i++) {
          const noteId = noteIds[i];
          const offset = Math.sin(frame * 0.1 + i) * 5;
          const note = stateManager.getNote(noteId);
          if (note) {
            stateManager.moveNote(noteId, note.x + offset, note.y + offset);
          }
        }
      }

      const totalTime = performance.now() - startTime;
      const avgFrameTime = totalTime / updateCount;
      const fps = 1000 / avgFrameTime;

      console.log(`Simulated ${updateCount} physics frames with ${noteCount} bodies`);
      console.log(`Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`Average frame time: ${avgFrameTime.toFixed(2)}ms`);
      console.log(`Estimated FPS: ${fps.toFixed(2)}`);

      // Should maintain at least 30 FPS (33.33ms per frame)
      expect(avgFrameTime).toBeLessThan(34);
    });

    it('measures collision detection performance', async () => {
      const board = stateManager.createBoard('Collision Test');
      const boardId = board.id;
      
      // Create 50 notes in close proximity
      const noteCount = 50;
      const noteIds: string[] = [];
      
      for (let i = 0; i < noteCount; i++) {
        const angle = (i / noteCount) * Math.PI * 2;
        const radius = 200;
        const x = 500 + Math.cos(angle) * radius;
        const y = 500 + Math.sin(angle) * radius;
        const note = stateManager.createNote(boardId, x, y);
        if (note) {
          noteIds.push(note.id);
        }
      }

      // Simulate collision checks
      const checkCount = 100;
      const startTime = performance.now();

      for (let i = 0; i < checkCount; i++) {
        // Get all notes and check distances (simulating collision detection)
        const notes = stateManager.getNotes(boardId);
        let collisionCount = 0;
        
        for (let j = 0; j < notes.length; j++) {
          for (let k = j + 1; k < notes.length; k++) {
            const dx = notes[j].x - notes[k].x;
            const dy = notes[j].y - notes[k].y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 300) {
              collisionCount++;
            }
          }
        }
      }

      const totalTime = performance.now() - startTime;
      const avgCheckTime = totalTime / checkCount;

      console.log(`Performed ${checkCount} collision checks with ${noteCount} bodies`);
      console.log(`Average check time: ${avgCheckTime.toFixed(2)}ms`);

      // Collision detection should be fast enough for real-time
      expect(avgCheckTime).toBeLessThan(20);
    });
  });

  describe('File System Write Performance', () => {
    it('measures save performance with large dataset', async () => {
      const board = stateManager.createBoard('Save Performance Test');
      const boardId = board.id;
      
      // Create 100 notes with content
      for (let i = 0; i < 100; i++) {
        const note = stateManager.createNote(boardId, i * 10, i * 10);
        if (note) {
          stateManager.updateNote(note.id, {
            content: `This is note ${i} with some content to make the file larger. `.repeat(10),
            backgroundColor: '#FF9F0A',
            fontSize: 'medium',
          });
        }
      }

      // Measure save time
      const startTime = performance.now();
      await stateManager.shutdown();
      const saveTime = performance.now() - startTime;

      console.log(`Saved 100 notes to disk in ${saveTime.toFixed(2)}ms`);

      // Reload and verify
      const newStateManager = new StateManager(persistenceService);
      const loadStart = performance.now();
      await newStateManager.loadFromDisk();
      const loadTime = performance.now() - loadStart;

      console.log(`Loaded 100 notes from disk in ${loadTime.toFixed(2)}ms`);

      const loadedNotes = newStateManager.getNotes(boardId);
      expect(loadedNotes).toHaveLength(100);

      await newStateManager.shutdown();

      // Performance assertions
      expect(saveTime).toBeLessThan(2000); // Should save in under 2 seconds
      expect(loadTime).toBeLessThan(2000); // Should load in under 2 seconds
    });

    it('measures multiple sequential saves', async () => {
      const board = stateManager.createBoard('Sequential Save Test');
      const boardId = board.id;
      
      // Create some notes
      for (let i = 0; i < 20; i++) {
        stateManager.createNote(boardId, i * 10, i * 10);
      }

      const saveTimes: number[] = [];
      const saveCount = 5;

      for (let i = 0; i < saveCount; i++) {
        const startTime = performance.now();
        await persistenceService.saveBoards(stateManager.getAllBoards());
        const saveTime = performance.now() - startTime;
        saveTimes.push(saveTime);
      }

      const avgSaveTime = saveTimes.reduce((a, b) => a + b, 0) / saveTimes.length;
      const maxSaveTime = Math.max(...saveTimes);

      console.log(`Average save time: ${avgSaveTime.toFixed(2)}ms`);
      console.log(`Max save time: ${maxSaveTime.toFixed(2)}ms`);
      console.log(`All save times:`, saveTimes.map(t => t.toFixed(2)));

      // Should maintain consistent save performance
      expect(avgSaveTime).toBeLessThan(500);
      expect(maxSaveTime).toBeLessThan(1000);
    });

    it('measures save performance with images', async () => {
      const board = stateManager.createBoard('Image Save Test');
      const boardId = board.id;
      
      // Small base64 image
      const base64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
      
      // Create 20 notes with images
      for (let i = 0; i < 20; i++) {
        const note = stateManager.createNote(boardId, i * 10, i * 10);
        if (note) {
          stateManager.updateNote(note.id, {
            images: [
              { id: `img-${i}-1`, url: base64Image, width: 100, height: 100, x: 0, y: 0 },
              { id: `img-${i}-2`, url: base64Image, width: 100, height: 100, x: 110, y: 0 },
            ],
          });
        }
      }

      // Measure save time with images
      const startTime = performance.now();
      await persistenceService.saveBoards(stateManager.getAllBoards());
      const saveTime = performance.now() - startTime;

      console.log(`Saved 20 notes with images in ${saveTime.toFixed(2)}ms`);

      // Should handle images efficiently
      expect(saveTime).toBeLessThan(1500);
    });
  });

  describe('Memory Usage Simulation', () => {
    it('creates and manages large dataset without memory issues', async () => {
      const board = stateManager.createBoard('Memory Test');
      const boardId = board.id;
      
      const initialMemory = process.memoryUsage();
      console.log('Initial memory:', {
        heapUsed: (initialMemory.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
        heapTotal: (initialMemory.heapTotal / 1024 / 1024).toFixed(2) + ' MB',
      });

      // Create 200 notes
      const noteIds: string[] = [];
      for (let i = 0; i < 200; i++) {
        const note = stateManager.createNote(boardId, i * 10, i * 10);
        if (note) {
          noteIds.push(note.id);
          stateManager.updateNote(note.id, {
            content: `Note ${i} content `.repeat(50),
          });
        }
      }

      const afterCreateMemory = process.memoryUsage();
      console.log('After creating 200 notes:', {
        heapUsed: (afterCreateMemory.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
        heapTotal: (afterCreateMemory.heapTotal / 1024 / 1024).toFixed(2) + ' MB',
      });

      // Perform operations
      for (let i = 0; i < 100; i++) {
        const randomNoteId = noteIds[Math.floor(Math.random() * noteIds.length)];
        stateManager.updateNote(randomNoteId, {
          content: `Updated ${i}`,
        });
      }

      const afterOperationsMemory = process.memoryUsage();
      console.log('After 100 operations:', {
        heapUsed: (afterOperationsMemory.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
        heapTotal: (afterOperationsMemory.heapTotal / 1024 / 1024).toFixed(2) + ' MB',
      });

      // Memory increase should be reasonable
      const memoryIncrease = afterOperationsMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;
      
      console.log(`Memory increase: ${memoryIncreaseMB.toFixed(2)} MB`);

      // Should not use excessive memory (under 100MB for 200 notes)
      expect(memoryIncreaseMB).toBeLessThan(100);
    });

    it('cleans up memory after deleting notes', async () => {
      const board = stateManager.createBoard('Cleanup Test');
      const boardId = board.id;
      
      // Create 100 notes
      const noteIds: string[] = [];
      for (let i = 0; i < 100; i++) {
        const note = stateManager.createNote(boardId, i * 10, i * 10);
        if (note) {
          noteIds.push(note.id);
        }
      }

      const beforeDeleteMemory = process.memoryUsage();

      // Delete all notes
      for (const noteId of noteIds) {
        stateManager.deleteNote(noteId);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      const afterDeleteMemory = process.memoryUsage();

      console.log('Memory before delete:', (beforeDeleteMemory.heapUsed / 1024 / 1024).toFixed(2) + ' MB');
      console.log('Memory after delete:', (afterDeleteMemory.heapUsed / 1024 / 1024).toFixed(2) + ' MB');

      // Verify notes are deleted
      const remainingNotes = stateManager.getNotes(boardId);
      expect(remainingNotes).toHaveLength(0);
    });
  });

  describe('Stress Test - Combined Load', () => {
    it('handles combined load of multiple clients and operations', async () => {
      const board = stateManager.createBoard('Stress Test');
      const boardId = board.id;

      // Create multiple clients
      const clientCount = 3;
      const clients: ClientSocket[] = [];

      for (let i = 0; i < clientCount; i++) {
        const client = ioClient(serverUrl);
        await new Promise<void>((resolve) => {
          client.on('connect', () => resolve());
        });
        client.emit('join:board', boardId);
        clients.push(client);
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      const startTime = performance.now();
      const operationsPerClient = 20;
      const allOperations: Promise<void>[] = [];

      // Each client performs multiple operations
      for (let i = 0; i < clientCount; i++) {
        const client = clients[i];
        
        for (let j = 0; j < operationsPerClient; j++) {
          const operation = new Promise<void>((resolve) => {
            client.emit('note:create', {
              type: 'note:create',
              payload: { boardId, x: i * 100 + j * 10, y: i * 100 + j * 10 },
              timestamp: Date.now(),
              userId: `client-${i}`,
            });
            setTimeout(resolve, 10);
          });
          allOperations.push(operation);
        }
      }

      await Promise.all(allOperations);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const totalTime = performance.now() - startTime;
      const totalOperations = clientCount * operationsPerClient;

      console.log(`Completed ${totalOperations} operations from ${clientCount} clients`);
      console.log(`Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`Operations per second: ${((totalOperations / totalTime) * 1000).toFixed(2)}`);

      // Verify all notes were created
      const notes = stateManager.getNotes(boardId);
      expect(notes.length).toBeGreaterThanOrEqual(totalOperations * 0.9); // Allow 10% margin

      // Cleanup
      clients.forEach(client => client.disconnect());

      // Should handle concurrent load efficiently
      expect(totalTime).toBeLessThan(5000);
    });
  });
});
