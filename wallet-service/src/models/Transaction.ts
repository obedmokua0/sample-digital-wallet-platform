/**
 * Transaction entity model
 * Immutable record of wallet operations (deposits, withdrawals, transfers)
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Wallet } from './Wallet';

/**
 * Transaction type enum
 */
export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  TRANSFER_DEBIT = 'transfer_debit',
  TRANSFER_CREDIT = 'transfer_credit',
}

/**
 * Transaction status enum
 */
export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Transaction entity
 * Maps to the transactions table in PostgreSQL
 */
@Entity('transactions')
@Index(['walletId', 'createdAt'])
@Index(['idempotencyKey'], { unique: true, where: 'idempotency_key IS NOT NULL' })
@Index(['createdAt'])
export class Transaction {
  /**
   * Unique transaction identifier (UUID)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Wallet affected by this transaction
   */
  @Column({ name: 'wallet_id', type: 'uuid' })
  walletId!: string;

  /**
   * Related wallet (for transfers)
   * NULL for deposits and withdrawals
   */
  @Column({ name: 'related_wallet_id', type: 'uuid', nullable: true })
  relatedWalletId!: string | null;

  /**
   * Transaction type
   * Determines the nature of the balance change
   */
  @Column({
    type: 'varchar',
    length: 30,
  })
  type!: TransactionType;

  /**
   * Transaction amount (always positive)
   * The sign is determined by the transaction type
   * Stored as NUMERIC(19,4) for precise decimal arithmetic
   */
  @Column({
    type: 'decimal',
    precision: 19,
    scale: 4,
  })
  amount!: string;

  /**
   * Currency of the transaction
   * Must match wallet currency
   */
  @Column({ type: 'varchar', length: 3 })
  currency!: string;

  /**
   * Wallet balance before this transaction
   * Snapshot for audit trail
   */
  @Column({
    name: 'balance_before',
    type: 'decimal',
    precision: 19,
    scale: 4,
  })
  balanceBefore!: string;

  /**
   * Wallet balance after this transaction
   * Must equal wallet.balance for completed transactions
   */
  @Column({
    name: 'balance_after',
    type: 'decimal',
    precision: 19,
    scale: 4,
  })
  balanceAfter!: string;

  /**
   * Transaction status
   * Most transactions go directly to completed
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: TransactionStatus.COMPLETED,
  })
  status!: TransactionStatus;

  /**
   * Client-provided idempotency key
   * Used to prevent duplicate processing from retries
   * Must be unique across all transactions
   */
  @Column({
    name: 'idempotency_key',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  idempotencyKey!: string | null;

  /**
   * Additional transaction metadata (JSON)
   * Can store custom fields like source, reference, etc.
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  /**
   * Transaction timestamp
   * Immutable - set once on creation
   */
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  /**
   * Relationship to wallet entity
   */
  @ManyToOne(() => Wallet, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'wallet_id' })
  wallet?: Wallet;

  /**
   * Relationship to related wallet (for transfers)
   */
  @ManyToOne(() => Wallet, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'related_wallet_id' })
  relatedWallet?: Wallet;
}

/**
 * Transaction interface for type safety
 */
export interface ITransaction {
  id: string;
  walletId: string;
  relatedWalletId: string | null;
  type: TransactionType;
  amount: string;
  currency: string;
  balanceBefore: string;
  balanceAfter: string;
  status: TransactionStatus;
  idempotencyKey: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

