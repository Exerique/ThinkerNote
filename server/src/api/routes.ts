import { Express, Request, Response } from 'express';
import { StateManager } from '../services/stateManager.js';
import { ValidationError } from '../../../shared/src/validation.js';

export function setupAPIRoutes(app: Express, stateManager: StateManager): void {
  // GET /api/boards - List all boards
  app.get('/api/boards', (_req: Request, res: Response) => {
    try {
      const boards = stateManager.getAllBoards();
      res.json(boards);
    } catch (error) {
      console.error('Error fetching boards:', error);
      res.status(500).json({
        error: 'Failed to fetch boards',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // POST /api/boards - Create a new board
  app.post('/api/boards', (req: Request, res: Response) => {
    try {
      const { name } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Board name is required and must be a non-empty string',
        });
      }

      const board = stateManager.createBoard(name);
      res.status(201).json(board);
    } catch (error) {
      console.error('Error creating board:', error);
      
      if (error instanceof ValidationError) {
        return res.status(400).json({
          error: 'Validation error',
          message: error.message,
        });
      }

      res.status(500).json({
        error: 'Failed to create board',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // DELETE /api/boards/:id - Delete a board
  app.delete('/api/boards/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Board ID is required',
        });
      }

      const success = stateManager.deleteBoard(id);

      if (!success) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Board not found',
        });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting board:', error);
      res.status(500).json({
        error: 'Failed to delete board',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // PUT /api/boards/:id - Rename a board
  app.put('/api/boards/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name } = req.body;

      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Board ID is required',
        });
      }

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Board name is required and must be a non-empty string',
        });
      }

      const board = stateManager.renameBoard(id, name);

      if (!board) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Board not found',
        });
      }

      res.json(board);
    } catch (error) {
      console.error('Error renaming board:', error);
      
      if (error instanceof ValidationError) {
        return res.status(400).json({
          error: 'Validation error',
          message: error.message,
        });
      }

      res.status(500).json({
        error: 'Failed to rename board',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // GET /api/boards/:id/notes - Get all notes for a board
  app.get('/api/boards/:id/notes', (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Board ID is required',
        });
      }

      const board = stateManager.getBoard(id);

      if (!board) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Board not found',
        });
      }

      const notes = stateManager.getNotes(id);
      res.json(notes);
    } catch (error) {
      console.error('Error fetching notes:', error);
      res.status(500).json({
        error: 'Failed to fetch notes',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  console.log('API routes initialized');
}
