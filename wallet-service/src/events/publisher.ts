/**
 * Event publisher module
 * Handles Redis connection and event publishing to outbox
 */

import Redis from 'ioredis';
import { getConfig } from '../config';
import * as logger from '../utils/logger';

/**
 * Redis client instance
 */
let redisClient: Redis | null = null;

/**
 * Initialize Redis connection
 * @returns {Promise<Redis>} Connected Redis client
 */
export async function initializeRedis(): Promise<Redis> {
  const config = getConfig();

  try {
    logger.info('Connecting to Redis...');
    
    redisClient = new Redis(config.redis.url, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    redisClient.on('error', (error: Error) => {
      logger.error('Redis connection error', error);
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected');
    });

    redisClient.on('ready', () => {
      logger.info('Redis ready');
    });

    // Wait for connection to be ready
    await redisClient.ping();
    
    return redisClient;
  } catch (error) {
    logger.error('Failed to connect to Redis', error as Error);
    throw error;
  }
}

/**
 * Close Redis connection
 * Used for graceful shutdown
 * @returns {Promise<void>}
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis connection closed');
  }
}

/**
 * Check Redis health
 * Used by readiness probe
 * @returns {Promise<boolean>} true if Redis is healthy
 */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    if (!redisClient) {
      return false;
    }
    await redisClient.ping();
    return true;
  } catch (error) {
    logger.error('Redis health check failed', error as Error);
    return false;
  }
}

/**
 * Get Redis client instance
 * @returns {Redis} Redis client
 * @throws {Error} If Redis is not initialized
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call initializeRedis() first.');
  }
  return redisClient;
}

/**
 * Publish event to Redis Stream
 * Used by OutboxWorker to publish events after they're saved to database
 * @param streamName - Name of the Redis Stream
 * @param event - Event payload to publish
 * @returns {Promise<string>} Event ID in Redis Stream
 */
export async function publishToStream(
  streamName: string,
  event: Record<string, unknown>,
): Promise<string> {
  const client = getRedisClient();
  
  // Convert event object to Redis Stream format (flat key-value pairs)
  const streamFields: string[] = ['event', JSON.stringify(event)];
  
  // Add event to stream using XADD
  const eventId = await client.xadd(streamName, '*', ...streamFields);
  
  return eventId;
}

