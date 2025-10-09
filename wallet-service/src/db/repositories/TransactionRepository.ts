/**
 * Transaction Repository
 * Data access layer for Transaction entity
 */

import { Repository, FindOptionsWhere, LessThanOrEqual, MoreThanOrEqual, Between } from 'typeorm';
import { Transaction, TransactionType, TransactionStatus } from '../../models/Transaction';
import { AppDataSource } from '../connection';

/**
 * Transaction filter options
 */
export interface TransactionFilters {
  type?: TransactionType;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  page: number;
  pageSize: number;
}

/**
 * Transaction repository for database operations
 */
export class TransactionRepository {
  private repository: Repository<Transaction>;

  constructor() {
    this.repository = AppDataSource.getRepository(Transaction);
  }

  /**
   * Create a new transaction
   * @param data - Transaction data
   * @returns {Promise<Transaction>} Created transaction
   */
  async create(data: {
    walletId: string;
    relatedWalletId?: string | null;
    type: TransactionType;
    amount: string;
    currency: string;
    balanceBefore: string;
    balanceAfter: string;
    status: TransactionStatus;
    idempotencyKey?: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<Transaction> {
    const transaction = this.repository.create(data);
    return await this.repository.save(transaction);
  }

  /**
   * Find transaction by ID
   * @param transactionId - Transaction UUID
   * @returns {Promise<Transaction | null>} Transaction or null if not found
   */
  async findById(transactionId: string): Promise<Transaction | null> {
    return await this.repository.findOne({
      where: { id: transactionId },
    });
  }

  /**
   * Find transaction by idempotency key
   * Used to prevent duplicate processing
   * @param idempotencyKey - Idempotency key
   * @returns {Promise<Transaction | null>} Transaction or null if not found
   */
  async findByIdempotencyKey(idempotencyKey: string): Promise<Transaction | null> {
    return await this.repository.findOne({
      where: { idempotencyKey },
    });
  }

  /**
   * Find transactions for a wallet with pagination and filters
   * @param walletId - Wallet UUID
   * @param pagination - Pagination options
   * @param filters - Optional filters
   * @returns {Promise<Transaction[]>} Array of transactions
   */
  async findByWalletId(
    walletId: string,
    pagination: PaginationOptions,
    filters?: TransactionFilters,
  ): Promise<Transaction[]> {
    const where: FindOptionsWhere<Transaction> = { walletId };

    // Apply filters
    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.startDate && filters?.endDate) {
      where.createdAt = Between(filters.startDate, filters.endDate);
    } else if (filters?.startDate) {
      where.createdAt = MoreThanOrEqual(filters.startDate);
    } else if (filters?.endDate) {
      where.createdAt = LessThanOrEqual(filters.endDate);
    }

    const skip = (pagination.page - 1) * pagination.pageSize;

    return await this.repository.find({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: pagination.pageSize,
    });
  }

  /**
   * Count transactions for a wallet with filters
   * @param walletId - Wallet UUID
   * @param filters - Optional filters
   * @returns {Promise<number>} Total count
   */
  async countByWalletId(walletId: string, filters?: TransactionFilters): Promise<number> {
    const where: FindOptionsWhere<Transaction> = { walletId };

    // Apply filters
    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.startDate && filters?.endDate) {
      where.createdAt = Between(filters.startDate, filters.endDate);
    } else if (filters?.startDate) {
      where.createdAt = MoreThanOrEqual(filters.startDate);
    } else if (filters?.endDate) {
      where.createdAt = LessThanOrEqual(filters.endDate);
    }

    return await this.repository.count({ where });
  }

  /**
   * Save transaction (for updates within transaction)
   * @param transaction - Transaction entity
   * @returns {Promise<Transaction>} Saved transaction
   */
  async save(transaction: Transaction): Promise<Transaction> {
    return await this.repository.save(transaction);
  }
}

