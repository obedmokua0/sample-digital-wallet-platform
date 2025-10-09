/**
 * Wallet Repository
 * Data access layer for Wallet entity
 */

import { Repository } from 'typeorm';
import { Wallet, WalletStatus } from '../../models/Wallet';
import { AppDataSource } from '../connection';
import { Currency } from '../../utils/validators';

/**
 * Wallet repository for database operations
 */
export class WalletRepository {
  private repository: Repository<Wallet>;

  constructor() {
    this.repository = AppDataSource.getRepository(Wallet);
  }

  /**
   * Create a new wallet
   * @param userId - ID of the user who owns the wallet
   * @param currency - ISO 4217 currency code
   * @returns {Promise<Wallet>} Created wallet
   */
  async create(userId: string, currency: Currency): Promise<Wallet> {
    const wallet = this.repository.create({
      userId,
      currency,
      balance: '0.0000',
      status: WalletStatus.ACTIVE,
      version: 1,
    });

    return await this.repository.save(wallet);
  }

  /**
   * Find wallet by ID
   * @param walletId - Wallet UUID
   * @returns {Promise<Wallet | null>} Wallet or null if not found
   */
  async findById(walletId: string): Promise<Wallet | null> {
    return await this.repository.findOne({
      where: { id: walletId },
    });
  }

  /**
   * Find wallet by ID with pessimistic lock (SELECT FOR UPDATE)
   * Used for transactions to prevent race conditions
   * Must be called within a transaction
   * @param walletId - Wallet UUID
   * @returns {Promise<Wallet | null>} Locked wallet or null if not found
   */
  async findByIdForUpdate(walletId: string): Promise<Wallet | null> {
    return await this.repository.findOne({
      where: { id: walletId },
      lock: { mode: 'pessimistic_write' },
    });
  }

  /**
   * Find all wallets for a user
   * @param userId - User ID
   * @returns {Promise<Wallet[]>} Array of user's wallets
   */
  async findByUserId(userId: string): Promise<Wallet[]> {
    return await this.repository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find wallet by user ID and currency
   * Used to check for duplicate wallets
   * @param userId - User ID
   * @param currency - Currency code
   * @returns {Promise<Wallet | null>} Wallet or null if not found
   */
  async findByUserIdAndCurrency(userId: string, currency: Currency): Promise<Wallet | null> {
    return await this.repository.findOne({
      where: { userId, currency },
    });
  }

  /**
   * Update wallet balance
   * @param walletId - Wallet UUID
   * @param newBalance - New balance value
   * @returns {Promise<void>}
   */
  async updateBalance(walletId: string, newBalance: string): Promise<void> {
    await this.repository.update(
      { id: walletId },
      {
        balance: newBalance,
        updatedAt: new Date(),
      },
    );
  }

  /**
   * Update wallet status
   * @param walletId - Wallet UUID
   * @param status - New status
   * @returns {Promise<void>}
   */
  async updateStatus(walletId: string, status: WalletStatus): Promise<void> {
    await this.repository.update(
      { id: walletId },
      {
        status,
        updatedAt: new Date(),
      },
    );
  }

  /**
   * Save wallet (for updates within transaction)
   * @param wallet - Wallet entity
   * @returns {Promise<Wallet>} Saved wallet
   */
  async save(wallet: Wallet): Promise<Wallet> {
    return await this.repository.save(wallet);
  }
}

