/**
 * Wallet entity model
 * Represents a user's digital wallet containing funds in a specific currency
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Wallet status enum
 */
export enum WalletStatus {
  ACTIVE = 'active',
  FROZEN = 'frozen',
  CLOSED = 'closed',
}

/**
 * Wallet entity
 * Maps to the wallets table in PostgreSQL
 */
@Entity('wallets')
@Index(['userId', 'currency'], { unique: true })
@Index(['userId'])
@Index(['status'])
export class Wallet {
  /**
   * Unique wallet identifier (UUID)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * ID of the user who owns the wallet
   * Extracted from JWT sub claim
   */
  @Column({ name: 'user_id', type: 'varchar', length: 255 })
  userId!: string;

  /**
   * Current wallet balance
   * Stored as NUMERIC(19,4) for precise decimal arithmetic
   * Never negative (enforced by check constraint and application logic)
   */
  @Column({
    type: 'decimal',
    precision: 19,
    scale: 4,
    default: 0,
  })
  balance!: string;

  /**
   * ISO 4217 currency code
   * Supported: USD, EUR, GBP
   */
  @Column({ type: 'varchar', length: 3 })
  currency!: string;

  /**
   * Wallet status
   * - active: Can perform all operations
   * - frozen: Read-only, no transactions allowed
   * - closed: Terminal state, cannot be reopened
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: WalletStatus.ACTIVE,
  })
  status!: WalletStatus;

  /**
   * Wallet creation timestamp
   */
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  /**
   * Last update timestamp
   * Updated automatically on any change
   */
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  /**
   * Optimistic lock version
   * Used for future optimistic concurrency control
   */
  @Column({ type: 'int', default: 1 })
  version!: number;
}

/**
 * Wallet interface for type safety
 */
export interface IWallet {
  id: string;
  userId: string;
  balance: string;
  currency: string;
  status: WalletStatus;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

