import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PersistenceService } from './persistence';
import { promises as fs } from 'fs';
import path from 'path';
import { Board } from '../../../shared/src/types';

describe('PersistenceService', () => {
  const testDataDir = './test-data-persistence';
  let persistenceService: PersistenceService;

  beforeEach(async () => {
    persistenceService = new PersistenceService(testDataDir);
    await persistenceService.initialize();
  });

  afterEach(async () => {
    // Clean up test data directory
    try {
      await fs.rm(testDataDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('initializes data directory', async () => {
    const stats = await fs.stat(testDataDir);
    expect(stats.isDirectory()).toBe(true);
  });

  it('loads empty boards when file does not exist', async () => {
    const boards = await persistenceService.loadBoards();
    expect(boards).toEqual([]);
  });

  it('saves and loads boards', async () => {
    const testBoards: Board[] = [
      {
        id: 'board-1',
        name: 'Test Board',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        notes: [],
      },
    ];

    await persistenceService.saveBoards(testBoards);
    const loaded = await persistenceService.loadBoards();
    
    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe('Test Board');
  });

  it('creates backup before overwriting', async () => {
    const testBoards: Board[] = [
      {
        id: 'board-1',
        name: 'Test Board',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        notes: [],
      },
    ];

    await persistenceService.saveBoards(testBoards);
    await persistenceService.saveBoards(testBoards);
    
    // Check if backup file exists
    const backupFile = path.join(testDataDir, 'boards.json.backup');
    const stats = await fs.stat(backupFile);
    expect(stats.isFile()).toBe(true);
  });
});
