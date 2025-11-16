import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PhysicsManager } from './physicsManager';
import { Note } from '../../../shared/src/types';

describe('PhysicsManager', () => {
  let physicsManager: PhysicsManager;
  let onPositionUpdate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onPositionUpdate = vi.fn();
    physicsManager = new PhysicsManager(onPositionUpdate);
  });

  afterEach(() => {
    physicsManager.destroy();
  });

  const mockNote: Note = {
    id: 'note-1',
    boardId: 'board-1',
    x: 100,
    y: 100,
    width: 280,
    height: 200,
    content: 'Test',
    backgroundColor: '#FFD60A',
    fontSize: 'medium',
    isExpanded: false,
    images: [],
    stickers: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  it('creates physics manager instance', () => {
    expect(physicsManager).toBeDefined();
  });

  it('adds note to physics world', () => {
    physicsManager.addOrUpdateNote(mockNote);
    // Verify no errors thrown
    expect(true).toBe(true);
  });

  it('removes note from physics world', () => {
    physicsManager.addOrUpdateNote(mockNote);
    physicsManager.removeNote(mockNote.id);
    // Verify no errors thrown
    expect(true).toBe(true);
  });

  it('applies momentum to note', () => {
    physicsManager.addOrUpdateNote(mockNote);
    physicsManager.applyMomentum(mockNote.id, 10, 5);
    // Verify no errors thrown
    expect(true).toBe(true);
  });

  it('sets note position', () => {
    physicsManager.addOrUpdateNote(mockNote);
    physicsManager.setNotePosition(mockNote.id, 200, 200);
    // Verify no errors thrown
    expect(true).toBe(true);
  });
});
