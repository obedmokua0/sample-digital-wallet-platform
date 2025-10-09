/**
 * Wallet Service
 * Business logic for wallet operations
 */

import { AppDataSource } from '../db/connection';
import { WalletRepository } from '../db/repositories/WalletRepository';
import { Wallet, WalletStatus } from '../models/Wallet';
import { validateCurrency } from '../utils/validators';
import { ConflictError, NotFoundError, ForbiddenError } from '../utils/errors';
import { EventService } from './EventService';
import { WalletCreatedEvent } from '../events/schemas';

/**
 * Wallet Service
 * Handles wallet creation, retrieval, and balance queries
 */
export class WalletService {
  private walletRepository: WalletRepository;
  private eventService: EventService;

  constructor() {
    this.walletRepository = new WalletRepository();
    this.eventService = new EventService();
  }

  /**
   * Create a new wallet for a user
   * @param userId - User ID from JWT
   * @param currency - ISO 4217 currency code
   * @param correlationId - Request correlation ID
   * @returns {Promise<Wallet>} Created wallet
   * @throws {ValidationError} If currency is invalid
   * @throws {ConflictError} If wallet already exists for user + currency
   */
  async createWallet(
    userId: string,
    currency: string,
    correlationId: string,
  ): Promise<Wallet> {
    // Validate currency
    const validatedCurrency = validateCurrency(currency);

    // Check for existing wallet
    const existing = await this.walletRepository.findByUserIdAndCurrency(
      userId,
      validatedCurrency,
    );

    if (existing) {
      throw new ConflictError(
        `Wallet already exists for user ${userId} with currency ${validatedCurrency}`,
      );
    }

    // Create wallet and publish event within transaction
    return await AppDataSource.transaction(async (manager) => {
      // Create wallet using manager
      const wallet = manager.create(Wallet, {
        userId,
        currency: validatedCurrency,
        balance: '0.0000',
        status: WalletStatus.ACTIVE,
        version: 1,
      });
      const savedWallet = await manager.save(Wallet, wallet);

      // Publish wallet.created event to outbox
      const event: WalletCreatedEvent = {
        eventType: 'wallet.created',
        walletId: savedWallet.id,
        userId: savedWallet.userId,
        currency: savedWallet.currency,
        initialBalance: savedWallet.balance,
        timestamp: new Date().toISOString(),
        correlationId,
      };

      await this.eventService.publishToOutbox(manager, event);

      return savedWallet;
    });
  }

  /**
   * Get wallet by ID
   * Verifies ownership before returning
   * @param walletId - Wallet UUID
   * @param userId - User ID from JWT (for ownership verification)
   * @returns {Promise<Wallet>} Wallet details
   * @throws {NotFoundError} If wallet doesn't exist
   * @throws {ForbiddenError} If user doesn't own the wallet
   */
  async getWallet(walletId: string, userId: string): Promise<Wallet> {
    const wallet = await this.walletRepository.findById(walletId);

    if (!wallet) {
      throw new NotFoundError('Wallet', walletId);
    }

    // Verify ownership
    if (wallet.userId !== userId) {
      throw new ForbiddenError('You do not have permission to access this wallet');
    }

    return wallet;
  }

  /**
   * Get wallet balance
   * @param walletId - Wallet UUID
   * @param userId - User ID from JWT (for ownership verification)
   * @returns {Promise<{balance: string, currency: string, asOf: string}>} Balance info
   * @throws {NotFoundError} If wallet doesn't exist
   * @throws {ForbiddenError} If user doesn't own the wallet
   */
  async getBalance(
    walletId: string,
    userId: string,
  ): Promise<{ walletId: string; balance: string; currency: string; asOf: string }> {
    const wallet = await this.getWallet(walletId, userId);

    return {
      walletId: wallet.id,
      balance: parseFloat(wallet.balance).toFixed(2),
      currency: wallet.currency,
      asOf: new Date().toISOString(),
    };
  }

  /**
   * Get all wallets for a user
   * @param userId - User ID from JWT
   * @returns {Promise<Wallet[]>} Array of user's wallets
   */
  async getUserWallets(userId: string): Promise<Wallet[]> {
    return await this.walletRepository.findByUserId(userId);
  }
}

