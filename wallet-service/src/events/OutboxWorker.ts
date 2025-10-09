/**
 * Outbox Worker
 * Background worker that polls the outbox_events table and publishes events to Redis Streams
 */

import { OutboxRepository } from '../db/repositories/OutboxRepository';
import { getRedisClient, publishToStream } from './publisher';
import { getConfig } from '../config';
import * as logger from '../utils/logger';

/**
 * Outbox Worker
 * Continuously polls outbox for unpublished events and publishes them to Redis
 */
export class OutboxWorker {
  private outboxRepository: OutboxRepository;
  private isRunning: boolean = false;
  private pollIntervalMs: number;
  private batchSize: number;
  private streamName: string;
  private timeoutId: NodeJS.Timeout | null = null;

  constructor() {
    this.outboxRepository = new OutboxRepository();
    const config = getConfig();
    this.pollIntervalMs = config.outbox.pollIntervalMs;
    this.batchSize = config.outbox.batchSize;
    this.streamName = config.redis.streamName;
  }

  /**
   * Start the outbox worker
   * Begins polling for unpublished events
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Outbox worker already running');
      return;
    }

    this.isRunning = true;
    logger.info('Outbox worker started', {
      pollIntervalMs: this.pollIntervalMs,
      batchSize: this.batchSize,
      streamName: this.streamName,
    });

    // Start polling immediately
    this.poll().catch((error) => {
      logger.error('Error in outbox worker initial poll', error);
    });
  }

  /**
   * Stop the outbox worker
   * Stops polling and cleans up
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    logger.info('Outbox worker stopped');
  }

  /**
   * Poll for unpublished events and publish them
   */
  private async poll(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      // Fetch unpublished events
      const events = await this.outboxRepository.findUnpublished(this.batchSize);

      if (events.length > 0) {
        logger.debug('Processing outbox events', { count: events.length });

        // Process each event
        const publishedEventIds: string[] = [];

        for (const event of events) {
          try {
            // Publish to Redis Stream
            const eventId = await publishToStream(this.streamName, event.payload);

            logger.debug('Event published to Redis', {
              outboxEventId: event.id,
              redisEventId: eventId,
              eventType: event.eventType,
              aggregateId: event.aggregateId,
            });

            publishedEventIds.push(event.id);
          } catch (error) {
            logger.error('Failed to publish event to Redis', error as Error, {
              outboxEventId: event.id,
              eventType: event.eventType,
              aggregateId: event.aggregateId,
            });

            // Continue with other events (at-least-once delivery)
            // Failed events will be retried in next poll
          }
        }

        // Mark successfully published events
        if (publishedEventIds.length > 0) {
          await this.outboxRepository.markManyAsPublished(publishedEventIds);

          logger.info('Events published successfully', {
            count: publishedEventIds.length,
            total: events.length,
          });
        }
      }
    } catch (error) {
      logger.error('Error in outbox worker poll', error as Error);
    }

    // Schedule next poll
    if (this.isRunning) {
      this.timeoutId = setTimeout(() => {
        this.poll().catch((error) => {
          logger.error('Error in outbox worker poll cycle', error);
        });
      }, this.pollIntervalMs);
    }
  }

  /**
   * Get worker status
   * @returns {boolean} true if worker is running
   */
  isActive(): boolean {
    return this.isRunning;
  }
}

