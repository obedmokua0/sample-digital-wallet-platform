/**
 * Outbox Repository
 * Data access layer for OutboxEvent entity
 */

import { Repository } from 'typeorm';
import { OutboxEvent } from '../../models/OutboxEvent';
import { AppDataSource } from '../connection';

/**
 * Outbox repository for database operations
 */
export class OutboxRepository {
  private repository: Repository<OutboxEvent>;

  constructor() {
    this.repository = AppDataSource.getRepository(OutboxEvent);
  }

  /**
   * Create a new outbox event
   * @param data - Event data
   * @returns {Promise<OutboxEvent>} Created outbox event
   */
  async create(data: {
    eventType: string;
    aggregateId: string;
    payload: Record<string, unknown>;
  }): Promise<OutboxEvent> {
    const event = this.repository.create({
      ...data,
      published: false,
      publishedAt: null,
    });

    return await this.repository.save(event);
  }

  /**
   * Find unpublished events (for outbox worker)
   * @param limit - Maximum number of events to return
   * @returns {Promise<OutboxEvent[]>} Array of unpublished events
   */
  async findUnpublished(limit: number): Promise<OutboxEvent[]> {
    return await this.repository.find({
      where: { published: false },
      order: { createdAt: 'ASC' },
      take: limit,
    });
  }

  /**
   * Mark event as published
   * @param eventId - Event ID
   * @returns {Promise<void>}
   */
  async markAsPublished(eventId: string): Promise<void> {
    await this.repository.update(
      { id: eventId },
      {
        published: true,
        publishedAt: new Date(),
      },
    );
  }

  /**
   * Mark multiple events as published
   * @param eventIds - Array of event IDs
   * @returns {Promise<void>}
   */
  async markManyAsPublished(eventIds: string[]): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(OutboxEvent)
      .set({
        published: true,
        publishedAt: new Date(),
      })
      .whereInIds(eventIds)
      .execute();
  }

  /**
   * Find events by aggregate ID
   * @param aggregateId - Aggregate ID (wallet or transaction ID)
   * @returns {Promise<OutboxEvent[]>} Array of events
   */
  async findByAggregateId(aggregateId: string): Promise<OutboxEvent[]> {
    return await this.repository.find({
      where: { aggregateId },
      order: { createdAt: 'DESC' },
    });
  }
}

