import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { PersistenceService } from './services/persistence.js';
import { StateManager } from './services/stateManager.js';
import { setupWebSocketHandlers } from './websocket/handlers.js';
import { setupAPIRoutes } from './api/routes.js';
import { logger } from './utils/logger.js';

const app = express();
const httpServer = createServer(app);

// Configure CORS
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json({ limit: '50mb' })); // Support large image uploads

// Initialize Socket.io with CORS
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Initialize logger
await logger.initialize();

// Initialize services
const persistenceService = new PersistenceService();
const stateManager = new StateManager(persistenceService);

// Load data on startup
try {
  await stateManager.loadFromDisk();
  logger.info('Data loaded successfully', 'Startup');
} catch (error) {
  logger.error(error as Error, 'Startup');
  logger.warn('Starting with empty state', 'Startup');
}

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Setup API routes
setupAPIRoutes(app, stateManager);

// Setup WebSocket handlers
setupWebSocketHandlers(io, stateManager);

// Configure port
const PORT = parseInt(process.env.PORT || '3001', 10);

httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`, 'Startup');
  logger.info(`Health check: http://localhost:${PORT}/health`, 'Startup');
  logger.info('WebSocket server ready', 'Startup');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...', 'Shutdown');
  try {
    await stateManager.shutdown();
    httpServer.close(() => {
      logger.info('Server closed', 'Shutdown');
      process.exit(0);
    });
  } catch (error) {
    logger.error(error as Error, 'Shutdown');
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...', 'Shutdown');
  try {
    await stateManager.shutdown();
    httpServer.close(() => {
      logger.info('Server closed', 'Shutdown');
      process.exit(0);
    });
  } catch (error) {
    logger.error(error as Error, 'Shutdown');
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error(error, 'UncaughtException');
  logger.error('Uncaught exception, shutting down...', 'UncaughtException');
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  logger.error(reason as Error, 'UnhandledRejection');
  logger.error('Unhandled rejection, shutting down...', 'UnhandledRejection');
  process.exit(1);
});
