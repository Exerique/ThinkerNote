import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StateManager } from './stateManager';
import { PersistenceService } from './persistence';
import { ValidationError } from '../../../shared/src/validation';

describe('StateManager', () => {
  let stateManager: StateManager;
  let persistenceService: PersistenceService;

  beforeEach(async () => {
    persistenceService = new PersistenceService('./test-data');
    stateManager = new StateManager(persistenceService);
    
    // Mock persistence methods
    vi.spyOn(persistenceService, 'initialize').mockResolvedValue();
    vi.spyOn(persistenceService, 'loadBoards').mockResolvedValue([]);
    vi.spyOn(persistenceService, 'saveBoards').mockResolvedValue();
    
    await stateManager.loadFromDisk();
  });

  afterEach(async () => {
    await stateManager.shutdown();
    vi.restoreAllMocks();
  });

  describe('Board CRUD Operations', () => {
    it('creates a new board', () => {
      const board = stateManager.createBoard('Test Board');
      expect(board).toBeDefined();
      expect(board.name).toBe('Test Board');
      expect(board.notes).toEqual([]);
    });

    it('throws error for empty board name', () => {
      expect(() => stateManager.createBoard('')).toThrow(ValidationError);
    });

    it('gets all boards', () => {
      stateManager.createBoard('Board 1');
      stateManager.createBoard('Board 2');
      const boards = stateManager.getAllBoards();
      expect(boards).toHaveLength(2);
    });

    it('gets board by ID', () => {
      const board = stateManager.createBoard('Test Board');
      const retrieved = stateManager.getBoard(board.id);
      expect(retrieved).toEqual(board);
    });

    it('deletes a board', () => {
      const board = stateManager.createBoard('Test Board');
      const deleted = stateManager.deleteBoard(board.id);
      expect(deleted).toBe(true);
      expect(stateManager.getBoard(board.id)).toBeUndefined();
    });

    it('renames a board', () => {
      const board = stateManager.createBoard('Old Name');
      const renamed = stateManager.renameBoard(board.id, 'New Name');
      expect(renamed?.name).toBe('New Name');
    });
  });

  describe('Note CRUD Operations', () => {
    let boardId: string;

    beforeEach(() => {
      const board = stateManager.createBoard('Test Board');
      boardId = board.id;
    });

    it('creates a new note', () => {
      const note = stateManager.createNote(boardId, 100, 200);
      expect(note).toBeDefined();
      expect(note?.x).toBe(100);
      expect(note?.y).toBe(200);
    });

    it('gets notes for a board', () => {
      stateManager.createNote(boardId, 100, 200);
      stateManager.createNote(boardId, 300, 400);
      const notes = stateManager.getNotes(boardId);
      expect(notes).toHaveLength(2);
    });

    it('updates a note', () => {
      const note = stateManager.createNote(boardId, 100, 200);
      const updated = stateManager.updateNote(note!.id, { content: 'Updated content' });
      expect(updated?.content).toBe('Updated content');
    });

    it('moves a note', () => {
      const note = stateManager.createNote(boardId, 100, 200);
      const moved = stateManager.moveNote(note!.id, 300, 400);
      expect(moved?.x).toBe(300);
      expect(moved?.y).toBe(400);
    });

    it('deletes a note', () => {
      const note = stateManager.createNote(boardId, 100, 200);
      const deleted = stateManager.deleteNote(note!.id);
      expect(deleted).toBe(true);
      expect(stateManager.getNote(note!.id)).toBeUndefined();
    });
  });
});
