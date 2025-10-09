/**
 * Database connection module
 * TypeORM DataSource configuration and connection management
 */

import { DataSource, DataSourceOptions } from 'typeorm';
import { Wallet } from '../models/Wallet';
import { Transaction } from '../models/Transaction';
import { OutboxEvent } from '../models/OutboxEvent';
import { getConfig } from '../config';
import * as logger from '../utils/logger';

/**
 * Create TypeORM DataSource configuration
 * @returns {DataSourceOptions} DataSource configuration
 */
function createDataSourceOptions(): DataSourceOptions {
  const config = getConfig();

  return {
    type: 'postgres',
    url: config.database.url,
    entities: [Wallet, Transaction, OutboxEvent],
    synchronize: false, // Never use in production - use migrations instead
    logging: config.server.nodeEnv === 'development' ? ['error', 'warn'] : false,
    extra: {
      min: config.database.poolMin,
      max: config.database.poolMax,
    },
    migrations: [],
    migrationsRun: false,
  };
}

/**
 * TypeORM DataSource instance
 */
export const AppDataSource = new DataSource(createDataSourceOptions());

/**
 * Initialize database connection
 * Attempts to connect to PostgreSQL with retry logic
 * @returns {Promise<DataSource>} Connected DataSource instance
 * @throws {Error} If connection fails after retries
 */
export async function initializeDatabase(): Promise<DataSource> {
  const maxRetries = 5;
  const retryDelay = 3000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info('Attempting database connection...', { attempt, maxRetries });
      await AppDataSource.initialize();
      logger.info('Database connected successfully');
      return AppDataSource;
    } catch (error) {
      logger.warn('Database connection failed', {
        attempt,
        maxRetries,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (attempt === maxRetries) {
        logger.error('Max database connection retries reached', error as Error);
        throw new Error('Failed to connect to database after multiple attempts');
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  throw new Error('Unexpected error in database initialization');
}

/**
 * Close database connection
 * Used for graceful shutdown
 * @returns {Promise<void>}
 */
export async function closeDatabase(): Promise<void> {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    logger.info('Database connection closed');
  }
}

/**
 * Check database health
 * Used by readiness probe
 * @returns {Promise<boolean>} true if database is healthy
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await AppDataSource.query('SELECT 1');
    return true;
  } catch (error) {
    logger.error('Database health check failed', error as Error);
    return false;
  }
}

