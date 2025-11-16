import { promises as fs } from 'fs';
import path from 'path';
import { Board } from '../../../shared/src/types.js';
import { validateBoard } from '../../../shared/src/validation.js';

export class PersistenceService {
  private dataDir: string;
  private boardsFile: string;

  constructor(dataDir: string = './data') {
    this.dataDir = dataDir;
    this.boardsFile = path.join(dataDir, 'boards.json');
  }

  /**
   * Initialize data directory structure
   */
  async initialize(): Promise<void> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await fs.mkdir(this.dataDir, { recursive: true });
        console.log(`Data directory initialized at: ${this.dataDir}`);
        return;
      } catch (error) {
        lastError = error as Error;
        console.error(`Failed to create data directory (attempt ${attempt}/${maxRetries}):`, error);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    throw new Error(`Failed to initialize data directory after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Load all boards from disk
   */
  async loadBoards(): Promise<Board[]> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Check if file exists
        try {
          await fs.access(this.boardsFile);
        } catch {
          // File doesn't exist, return empty array
          console.log('No existing boards file found, starting fresh');
          return [];
        }

        // Read and parse file
        const data = await fs.readFile(this.boardsFile, 'utf-8');
        
        if (!data.trim()) {
          return [];
        }

        let boards;
        try {
          boards = JSON.parse(data);
        } catch (parseError) {
          console.error('Failed to parse boards file, attempting to load from backup');
          // Try to load from backup
          try {
            const backupFile = `${this.boardsFile}.backup`;
            await fs.access(backupFile);
            const backupData = await fs.readFile(backupFile, 'utf-8');
            boards = JSON.parse(backupData);
            console.log('Successfully loaded from backup file');
          } catch (backupError) {
            console.error('Failed to load from backup, starting with empty state');
            return [];
          }
        }

        if (!Array.isArray(boards)) {
          console.error('Invalid boards data format, expected array');
          return [];
        }

        // Validate each board
        const validBoards: Board[] = [];
        for (const board of boards) {
          try {
            validateBoard(board);
            validBoards.push(board);
          } catch (error) {
            console.error(`Invalid board data, skipping:`, error);
          }
        }

        console.log(`Loaded ${validBoards.length} boards from disk`);
        return validBoards;
      } catch (error) {
        lastError = error as Error;
        console.error(`Failed to load boards (attempt ${attempt}/${maxRetries}):`, error);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    console.error(`Failed to load boards after ${maxRetries} attempts, starting with empty state:`, lastError);
    // Return empty array instead of throwing to allow server to start
    return [];
  }

  /**
   * Save all boards to disk with atomic write and backup
   */
  async saveBoards(boards: Board[]): Promise<void> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Ensure data directory exists
        await this.initialize();

        // Create backup of existing file if it exists
        try {
          await fs.access(this.boardsFile);
          const backupFile = `${this.boardsFile}.backup`;
          await fs.copyFile(this.boardsFile, backupFile);
        } catch {
          // No existing file to backup
        }

        // Write to temporary file first (atomic write)
        const tempFile = `${this.boardsFile}.tmp`;
        const data = JSON.stringify(boards, null, 2);
        await fs.writeFile(tempFile, data, 'utf-8');

        // Rename temp file to actual file (atomic operation)
        await fs.rename(tempFile, this.boardsFile);

        console.log(`Saved ${boards.length} boards to disk`);
        return;
      } catch (error) {
        lastError = error as Error;
        console.error(`Save attempt ${attempt} failed:`, error);
        
        if (attempt < maxRetries) {
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    // All retries failed
    throw new Error(`Failed to save boards after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Get the path to the data directory
   */
  getDataDir(): string {
    return this.dataDir;
  }
}
