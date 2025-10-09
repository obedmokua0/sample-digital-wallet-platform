/**
 * Outbox Event entity model
 * Transactional outbox pattern for reliable event publishing
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Outbox Event entity
 * Maps to the outbox_events table in PostgreSQL
 */
@Entity('outbox_events')
@Index(['published', 'createdAt'], { where: 'published = false' })
@Index(['aggregateId'])
export class OutboxEvent {
  /**
   * Sequential event identifier
   */
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  /**
   * Type of event (e.g., wallet.created, funds.deposited)
   */
  @Column({ name: 'event_type', type: 'varchar', length: 100 })
  eventType!: string;

  /**
   * ID of affected entity (wallet_id or transaction_id)
   * Used for querying events by aggregate
   */
  @Column({ name: 'aggregate_id', type: 'uuid' })
  aggregateId!: string;

  /**
   * Full event payload (JSON)
   * Contains all event data to be published to Redis
   */
  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  /**
   * Whether event has been published to Redis
   * false = pending, true = published
   */
  @Column({ type: 'boolean', default: false })
  published!: boolean;

  /**
   * When event was published to Redis
   * NULL if not yet published
   */
  @Column({
    name: 'published_at',
    type: 'timestamptz',
    nullable: true,
  })
  publishedAt!: Date | null;

  /**
   * When event was created (transaction timestamp)
   */
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

/**
 * Outbox Event interface for type safety
 */
export interface IOutboxEvent {
  id: string;
  eventType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  published: boolean;
  publishedAt: Date | null;
  createdAt: Date;
}

