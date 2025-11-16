import { v4 as uuidv4 } from 'uuid';
import { Board, Note } from '../../../shared/src/types.js';
import { validateBoard, validateNote, ValidationError } from '../../../shared/src/validation.js';
import { PersistenceService } from './persistence.js';

export class StateManager {
  private boards: Map<string, Board> = new Map();
  private notes: Map<string, Note> = new Map();
  private persistenceService: PersistenceService;
  private autoSaveInterval: NodeJS.Timeout | null = null;
  private isDirty: boolean = false;
  private isSaving: boolean = false; // Lock to prevent concurrent saves

  constructor(persistenceService: PersistenceService) {
    this.persistenceService = persistenceService;
  }

  /**
   * Load data from disk on startup
   */
  async loadFromDisk(): Promise<void> {
    try {
      await this.persistenceService.initialize();
      const boards = await this.persistenceService.loadBoards();
      
      // Populate in-memory stores
      for (const board of boards) {
        this.boards.set(board.id, board);
        
        // Index all notes
        for (const note of board.notes) {
          this.notes.set(note.id, note);
        }
      }

      console.log(`State manager initialized with ${this.boards.size} boards and ${this.notes.size} notes`);

      // Start auto-save mechanism (every 30 seconds)
      this.startAutoSave();
    } catch (error) {
      console.error('Failed to load data from disk:', error);
      throw error;
    }
  }

  /**
   * Start auto-save mechanism
   */
  private startAutoSave(): void {
    this.autoSaveInterval = setInterval(async () => {
      if (this.isDirty && !this.isSaving) {
        try {
          this.isSaving = true;
          await this.saveToDisk();
          this.isDirty = false;
        } catch (error) {
          console.error('Auto-save failed:', error);
        } finally {
          this.isSaving = false;
        }
      }
    }, 30000); // 30 seconds

    console.log('Auto-save mechanism started (30 second interval)');
  }

  /**
   * Save current state to disk
   */
  async saveToDisk(): Promise<void> {
    try {
      const boards = Array.from(this.boards.values());
      await this.persistenceService.saveBoards(boards);
    } catch (error) {
      // Log critical error but don't crash server
      console.error('CRITICAL: Failed to save boards to disk:', error);
      // TODO: Implement alerting mechanism for critical errors
    }
  }

  /**
   * Mark state as dirty (needs saving)
   */
  private markDirty(): void {
    this.isDirty = true;
  }

  /**
   * Shutdown and cleanup
   */
  async shutdown(): Promise<void> {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    // Final save before shutdown
    if (this.isDirty) {
      await this.saveToDisk();
    }

    console.log('State manager shutdown complete');
  }

  // ===== Board CRUD Operations =====

  /**
   * Get all boards
   */
  getAllBoards(): Board[] {
    return Array.from(this.boards.values());
  }

  /**
   * Get a board by ID
   */
  getBoard(boardId: string): Board | undefined {
    return this.boards.get(boardId);
  }

  /**
   * Create a new board
   */
  createBoard(name: string): Board {
    if (!name || name.trim().length === 0) {
      throw new ValidationError('Board name cannot be empty');
    }

    const now = Date.now();
    const board: Board = {
      id: uuidv4(),
      name: name.trim(),
      createdAt: now,
      updatedAt: now,
      notes: [],
    };

    try {
      validateBoard(board);
      this.boards.set(board.id, board);
      this.markDirty();
      console.log(`Created board: ${board.id} - ${board.name}`);
      return board;
    } catch (error) {
      console.error('Failed to create board:', error);
      throw error;
    }
  }

  /**
   * Delete a board
   */
  deleteBoard(boardId: string): boolean {
    const board = this.boards.get(boardId);
    if (!board) {
      return false;
    }

    // Delete all notes in the board
    for (const note of board.notes) {
      this.notes.delete(note.id);
    }

    this.boards.delete(boardId);
    this.markDirty();
    console.log(`Deleted board: ${boardId}`);
    return true;
  }

  /**
   * Rename a board
   */
  renameBoard(boardId: string, newName: string): Board | undefined {
    if (!newName || newName.trim().length === 0) {
      throw new ValidationError('Board name cannot be empty');
    }

    const board = this.boards.get(boardId);
    if (!board) {
      return undefined;
    }

    board.name = newName.trim();
    board.updatedAt = Date.now();
    this.markDirty();
    console.log(`Renamed board: ${boardId} to ${newName}`);
    return board;
  }

  // ===== Note CRUD Operations =====

  /**
   * Get all notes for a board
   */
  getNotes(boardId: string): Note[] {
    const board = this.boards.get(boardId);
    return board ? board.notes : [];
  }

  /**
   * Get a note by ID
   */
  getNote(noteId: string): Note | undefined {
    return this.notes.get(noteId);
  }

  /**
   * Create a new note
   */
  createNote(boardId: string, x: number, y: number): Note | undefined {
    const board = this.boards.get(boardId);
    if (!board) {
      console.error(`Board not found: ${boardId}`);
      return undefined;
    }

    // Validate and clamp position to reasonable bounds
    const MAX_POSITION = 100000;
    const MIN_POSITION = -100000;
    const clampedX = Math.max(MIN_POSITION, Math.min(MAX_POSITION, x));
    const clampedY = Math.max(MIN_POSITION, Math.min(MAX_POSITION, y));

    const now = Date.now();
    const note: Note = {
      id: uuidv4(),
      boardId,
      x: clampedX,
      y: clampedY,
      width: 280,
      height: 200,
      content: '',
      backgroundColor: '#FFD60A', // Default yellow
      fontSize: 'medium',
      isExpanded: true, // Start expanded so users can type immediately
      images: [],
      stickers: [],
      createdAt: now,
      updatedAt: now,
      version: 1, // Initialize version
    };

    try {
      validateNote(note);
      this.notes.set(note.id, note);
      board.notes.push(note);
      board.updatedAt = now;
      this.markDirty();
      console.log(`Created note: ${note.id} on board ${boardId}`);
      return note;
    } catch (error) {
      console.error('Failed to create note:', error);
      return undefined;
    }
  }

  /**
   * Update a note (last-write-wins conflict resolution)
   */
  updateNote(noteId: string, updates: Partial<Note>): Note | undefined {
    const note = this.notes.get(noteId);
    if (!note) {
      console.error(`Note not found: ${noteId}`);
      return undefined;
    }

    const board = this.boards.get(note.boardId);
    if (!board) {
      console.error(`Board not found for note: ${note.boardId}`);
      return undefined;
    }

    // Apply updates (last-write-wins with version increment)
    const currentVersion = note.version || 1;
    Object.assign(note, updates, {
      updatedAt: Date.now(),
      version: currentVersion + 1, // Increment version for conflict detection
    });

    try {
      validateNote(note);
      board.updatedAt = Date.now();
      this.markDirty();
      console.log(`Updated note: ${noteId}`);
      return note;
    } catch (error) {
      console.error('Failed to update note:', error);
      return undefined;
    }
  }

  /**
   * Move a note to a new position
   */
  moveNote(noteId: string, x: number, y: number): Note | undefined {
    return this.updateNote(noteId, { x, y });
  }

  /**
   * Delete a note
   */
  deleteNote(noteId: string): boolean {
    const note = this.notes.get(noteId);
    if (!note) {
      return false;
    }

    const board = this.boards.get(note.boardId);
    if (!board) {
      return false;
    }

    // Remove from board's notes array
    board.notes = board.notes.filter(n => n.id !== noteId);
    board.updatedAt = Date.now();

    // Remove from notes map
    this.notes.delete(noteId);
    this.markDirty();
    console.log(`Deleted note: ${noteId}`);
    return true;
  }

  /**
   * Get statistics about current state
   */
  getStats() {
    return {
      boards: this.boards.size,
      notes: this.notes.size,
      isDirty: this.isDirty,
    };
  }
}
