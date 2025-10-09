/**
 * Main entry point for the Wallet Microservice
 * Initializes all connections and starts the HTTP server
 */

import * as dotenv from 'dotenv';
import { createApp } from './api/server';
import { initializeDatabase, closeDatabase } from './db/connection';
import { initializeRedis, closeRedis } from './events/publisher';
import { OutboxWorker } from './events/OutboxWorker';
import { getConfig } from './config';
import * as logger from './utils/logger';

// Load environment variables
dotenv.config();

/**
 * Start the application
 */
async function startServer(): Promise<void> {
  try {
    // Load configuration
    const config = getConfig();
    logger.info('Configuration loaded', {
      nodeEnv: config.server.nodeEnv,
      port: config.server.port,
    });

    // Initialize database connection
    await initializeDatabase();

    // Initialize Redis connection
    await initializeRedis();

    // Start Outbox Worker
    const outboxWorker = new OutboxWorker();
    outboxWorker.start();

    // Create Express app
    const app = createApp();

    // Start HTTP server
    const server = app.listen(config.server.port, () => {
      logger.info('Server started', {
        port: config.server.port,
        nodeEnv: config.server.nodeEnv,
      });
    });

    // Graceful shutdown handler
    const shutdown = async (signal: string): Promise<void> => {
      logger.info('Shutdown signal received', { signal });

      // Stop outbox worker
      outboxWorker.stop();

      // Stop accepting new connections
      server.close(() => {
        logger.info('HTTP server closed');
      });

      try {
        // Close database connection
        await closeDatabase();

        // Close Redis connection
        await closeRedis();

        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', error as Error);
        process.exit(1);
      }
    };

    // Register shutdown handlers
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught exception', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason: unknown) => {
      logger.error('Unhandled rejection', reason as Error);
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server', error as Error);
    process.exit(1);
  }
}

// Start the server
startServer().catch((error: Error) => {
  logger.error('Unexpected error during startup', error);
  process.exit(1);
});

