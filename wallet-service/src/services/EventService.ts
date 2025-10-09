/**
 * Event Service
 * Publishes events to the outbox table (transactional outbox pattern)
 */

import { EntityManager } from 'typeorm';
import { OutboxEvent } from '../models/OutboxEvent';
import { WalletEvent } from '../events/schemas';

/**
 * Event Service for publishing events to outbox
 * Events are written to database within the same transaction as business operations
 * Background worker polls outbox and publishes to Redis Streams
 */
export class EventService {
  /**
   * Publish event to outbox within a transaction
   * @param manager - TypeORM Entity Manager (from transaction)
   * @param event - Event to publish
   * @returns {Promise<OutboxEvent>} Created outbox event
   */
  async publishToOutbox(manager: EntityManager, event: WalletEvent): Promise<OutboxEvent> {
    const outboxEvent = manager.create(OutboxEvent, {
      eventType: event.eventType,
      aggregateId: this.getAggregateId(event),
      payload: event as unknown as Record<string, unknown>,
      published: false,
      publishedAt: null,
    });

    return await manager.save(OutboxEvent, outboxEvent);
  }

  /**
   * Extract aggregate ID from event
   * @param event - Wallet event
   * @returns {string} Aggregate ID (wallet or transaction ID)
   */
  private getAggregateId(event: WalletEvent): string {
    switch (event.eventType) {
      case 'wallet.created':
        return event.walletId;
      case 'funds.deposited':
      case 'funds.withdrawn':
        return event.transactionId;
      case 'funds.transfer.debited':
      case 'funds.transfer.credited':
        return event.transferId;
      default:
        // Fallback to walletId if event type unknown
        return (event as { walletId?: string }).walletId || 'unknown';
    }
  }
}

