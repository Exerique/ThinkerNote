import { describe, it, expect } from 'vitest';
import {
  validateBoard,
  validateNote,
  validateImage,
  validateSticker,
  ValidationError,
} from './validation';

describe('Validation', () => {
  describe('validateBoard', () => {
    it('validates a valid board', () => {
      const board = {
        id: 'board-1',
        name: 'Test Board',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        notes: [],
      };
      expect(() => validateBoard(board)).not.toThrow();
    });

    it('throws error for invalid board', () => {
      const board = {
        id: '',
        name: 'Test Board',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        notes: [],
      };
      expect(() => validateBoard(board)).toThrow(ValidationError);
    });
  });

  describe('validateNote', () => {
    it('validates a valid note', () => {
      const note = {
        id: 'note-1',
        boardId: 'board-1',
        x: 100,
        y: 200,
        width: 280,
        height: 200,
        content: 'Test content',
        backgroundColor: '#FFD60A',
        fontSize: 'medium' as const,
        isExpanded: false,
        images: [],
        stickers: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      expect(() => validateNote(note)).not.toThrow();
    });

    it('throws error for content exceeding limit', () => {
      const note = {
        id: 'note-1',
        boardId: 'board-1',
        x: 100,
        y: 200,
        width: 280,
        height: 200,
        content: 'a'.repeat(10001),
        backgroundColor: '#FFD60A',
        fontSize: 'medium' as const,
        isExpanded: false,
        images: [],
        stickers: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      expect(() => validateNote(note)).toThrow(ValidationError);
    });
  });

  describe('validateImage', () => {
    it('validates a valid image', () => {
      const image = {
        id: 'img-1',
        url: 'data:image/png;base64,abc',
        width: 200,
        height: 150,
        x: 0,
        y: 0,
      };
      expect(() => validateImage(image)).not.toThrow();
    });
  });

  describe('validateSticker', () => {
    it('validates a valid sticker', () => {
      const sticker = {
        id: 'sticker-1',
        type: '❤️',
        x: 50,
        y: 50,
        scale: 1.0,
      };
      expect(() => validateSticker(sticker)).not.toThrow();
    });

    it('throws error for invalid scale', () => {
      const sticker = {
        id: 'sticker-1',
        type: '❤️',
        x: 50,
        y: 50,
        scale: 3.0,
      };
      expect(() => validateSticker(sticker)).toThrow(ValidationError);
    });
  });
});
