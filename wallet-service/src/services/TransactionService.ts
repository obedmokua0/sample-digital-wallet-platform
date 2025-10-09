/**
 * Transaction Service
 * Business logic for transaction operations (deposit, withdraw, transfer)
 */

import { AppDataSource } from '../db/connection';
import { TransactionRepository } from '../db/repositories/TransactionRepository';
import { Transaction, TransactionType, TransactionStatus } from '../models/Transaction';
import { Wallet } from '../models/Wallet';
import {
  validateAmount,
  validateMaxTransactionAmount,
  validateMaxWalletBalance,
  validateWalletActive,
  Currency,
} from '../utils/validators';
import {
  NotFoundError,
  ForbiddenError,
  InsufficientFundsError,
  InvalidTransferError,
  CurrencyMismatchError,
} from '../utils/errors';
import { EventService } from './EventService';
import { FundsDepositedEvent, FundsWithdrawnEvent } from '../events/schemas';
import { getConfig } from '../config';
import { v4 as uuidv4 } from 'uuid';

/**
 * Transaction Service
 * Handles deposit, withdraw, and transfer operations
 */
export class TransactionService {
  private transactionRepository: TransactionRepository;
  private eventService: EventService;

  constructor() {
    this.transactionRepository = new TransactionRepository();
    this.eventService = new EventService();
  }

  /**
   * Deposit funds into a wallet
   * @param walletId - Wallet UUID
   * @param amount - Amount to deposit (as string)
   * @param userId - User ID from JWT (for ownership verification)
   * @param idempotencyKey - Client-provided idempotency key
   * @param correlationId - Request correlation ID
   * @param metadata - Optional transaction metadata
   * @returns {Promise<Transaction>} Created transaction
   * @throws {ValidationError} If amount is invalid
   * @throws {NotFoundError} If wallet doesn't exist
   * @throws {ForbiddenError} If user doesn't own the wallet
   */
  async deposit(
    walletId: string,
    amount: string,
    userId: string,
    idempotencyKey: string | null,
    correlationId: string,
    metadata?: Record<string, unknown>,
  ): Promise<Transaction> {
    // Check idempotency key first (before any transaction)
    if (idempotencyKey) {
      const existingTransaction = await this.transactionRepository.findByIdempotencyKey(
        idempotencyKey,
      );
      if (existingTransaction) {
        return existingTransaction;
      }
    }

    // Validate amount
    const numericAmount = validateAmount(amount);
    const config = getConfig();

    return await AppDataSource.transaction(async (manager) => {
      // Lock wallet row (SELECT FOR UPDATE)
      const walletRepo = manager.getRepository(Wallet);
      const wallet = await walletRepo.findOne({
        where: { id: walletId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new NotFoundError('Wallet', walletId);
      }

      // Verify ownership
      if (wallet.userId !== userId) {
        throw new ForbiddenError('You do not have permission to access this wallet');
      }

      // Validate wallet is active
      validateWalletActive(wallet.status);

      // Validate transaction amount doesn't exceed limit
      validateMaxTransactionAmount(numericAmount, wallet.currency as Currency, config.limits.maxTransactionAmount);

      // Calculate new balance
      const currentBalance = parseFloat(wallet.balance);
      const newBalance = currentBalance + numericAmount;

      // Validate new balance doesn't exceed limit
      validateMaxWalletBalance(newBalance, wallet.currency as Currency, config.limits.maxWalletBalance);

      // Update wallet balance
      wallet.balance = newBalance.toFixed(4);
      wallet.updatedAt = new Date();
      await walletRepo.save(wallet);

      // Create transaction record
      const transactionRepo = manager.getRepository(Transaction);
      const transaction = transactionRepo.create({
        walletId: wallet.id,
        relatedWalletId: null,
        type: TransactionType.DEPOSIT,
        amount: numericAmount.toFixed(4),
        currency: wallet.currency,
        balanceBefore: currentBalance.toFixed(4),
        balanceAfter: newBalance.toFixed(4),
        status: TransactionStatus.COMPLETED,
        idempotencyKey: idempotencyKey || null,
        metadata: metadata || null,
      });
      const savedTransaction = await transactionRepo.save(transaction);

      // Publish funds.deposited event to outbox
      const event: FundsDepositedEvent = {
        eventType: 'funds.deposited',
        walletId: wallet.id,
        transactionId: savedTransaction.id,
        amount: numericAmount.toFixed(2),
        currency: wallet.currency,
        previousBalance: currentBalance.toFixed(2),
        newBalance: newBalance.toFixed(2),
        timestamp: new Date().toISOString(),
        correlationId,
        metadata: metadata || undefined,
      };

      await this.eventService.publishToOutbox(manager, event);

      return savedTransaction;
    });
  }

  /**
   * Withdraw funds from a wallet
   * @param walletId - Wallet UUID
   * @param amount - Amount to withdraw (as string)
   * @param userId - User ID from JWT (for ownership verification)
   * @param idempotencyKey - Client-provided idempotency key
   * @param correlationId - Request correlation ID
   * @param metadata - Optional transaction metadata
   * @returns {Promise<Transaction>} Created transaction
   * @throws {ValidationError} If amount is invalid
   * @throws {NotFoundError} If wallet doesn't exist
   * @throws {ForbiddenError} If user doesn't own the wallet
   * @throws {InsufficientFundsError} If wallet balance is too low
   */
  async withdraw(
    walletId: string,
    amount: string,
    userId: string,
    idempotencyKey: string | null,
    correlationId: string,
    metadata?: Record<string, unknown>,
  ): Promise<Transaction> {
    // Check idempotency key first
    if (idempotencyKey) {
      const existingTransaction = await this.transactionRepository.findByIdempotencyKey(
        idempotencyKey,
      );
      if (existingTransaction) {
        return existingTransaction;
      }
    }

    // Validate amount
    const numericAmount = validateAmount(amount);
    const config = getConfig();

    return await AppDataSource.transaction(async (manager) => {
      // Lock wallet row
      const walletRepo = manager.getRepository(Wallet);
      const wallet = await walletRepo.findOne({
        where: { id: walletId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new NotFoundError('Wallet', walletId);
      }

      // Verify ownership
      if (wallet.userId !== userId) {
        throw new ForbiddenError('You do not have permission to access this wallet');
      }

      // Validate wallet is active
      validateWalletActive(wallet.status);

      // Validate transaction amount doesn't exceed limit
      validateMaxTransactionAmount(numericAmount, wallet.currency as Currency, config.limits.maxTransactionAmount);

      // Calculate new balance
      const currentBalance = parseFloat(wallet.balance);
      const newBalance = currentBalance - numericAmount;

      // Check sufficient funds
      if (newBalance < 0) {
        throw new InsufficientFundsError(
          numericAmount.toFixed(2),
          currentBalance.toFixed(2),
        );
      }

      // Update wallet balance
      wallet.balance = newBalance.toFixed(4);
      wallet.updatedAt = new Date();
      await walletRepo.save(wallet);

      // Create transaction record
      const transactionRepo = manager.getRepository(Transaction);
      const transaction = transactionRepo.create({
        walletId: wallet.id,
        relatedWalletId: null,
        type: TransactionType.WITHDRAWAL,
        amount: numericAmount.toFixed(4),
        currency: wallet.currency,
        balanceBefore: currentBalance.toFixed(4),
        balanceAfter: newBalance.toFixed(4),
        status: TransactionStatus.COMPLETED,
        idempotencyKey: idempotencyKey || null,
        metadata: metadata || null,
      });
      const savedTransaction = await transactionRepo.save(transaction);

      // Publish funds.withdrawn event to outbox
      const event: FundsWithdrawnEvent = {
        eventType: 'funds.withdrawn',
        walletId: wallet.id,
        transactionId: savedTransaction.id,
        amount: numericAmount.toFixed(2),
        currency: wallet.currency,
        previousBalance: currentBalance.toFixed(2),
        newBalance: newBalance.toFixed(2),
        timestamp: new Date().toISOString(),
        correlationId,
        metadata: metadata || undefined,
      };

      await this.eventService.publishToOutbox(manager, event);

      return savedTransaction;
    });
  }

  /**
   * Transfer funds between wallets
   * @param sourceWalletId - Source wallet UUID
   * @param destinationWalletId - Destination wallet UUID
   * @param amount - Amount to transfer (as string)
   * @param userId - User ID from JWT (for ownership verification of source)
   * @param idempotencyKey - Client-provided idempotency key
   * @param correlationId - Request correlation ID
   * @param metadata - Optional transaction metadata
   * @returns {Promise<{sourceTransaction: Transaction, destinationTransaction: Transaction, transferId: string}>}
   * @throws {ValidationError} If amount is invalid or wallets are the same
   * @throws {NotFoundError} If either wallet doesn't exist
   * @throws {ForbiddenError} If user doesn't own the source wallet
   * @throws {InsufficientFundsError} If source wallet balance is too low
   * @throws {CurrencyMismatchError} If wallet currencies don't match
   */
  async transfer(
    sourceWalletId: string,
    destinationWalletId: string,
    amount: string,
    userId: string,
    idempotencyKey: string | null,
    correlationId: string,
    metadata?: Record<string, unknown>,
  ): Promise<{
    sourceTransaction: Transaction;
    destinationTransaction: Transaction;
    transferId: string;
  }> {
    // Check idempotency key first
    if (idempotencyKey) {
      const existingTransaction = await this.transactionRepository.findByIdempotencyKey(
        idempotencyKey,
      );
      if (existingTransaction) {
        // For transfers, we need to return both transactions
        // Find the paired transaction
        const relatedTransaction = await this.transactionRepository.findById(
          existingTransaction.relatedWalletId || '',
        );
        
        return {
          sourceTransaction: existingTransaction.type === TransactionType.TRANSFER_DEBIT 
            ? existingTransaction 
            : relatedTransaction!,
          destinationTransaction: existingTransaction.type === TransactionType.TRANSFER_CREDIT 
            ? existingTransaction 
            : relatedTransaction!,
          transferId: existingTransaction.metadata?.transferId as string || existingTransaction.id,
        };
      }
    }

    // Validate wallets are different
    if (sourceWalletId === destinationWalletId) {
      throw new InvalidTransferError('Cannot transfer to the same wallet');
    }

    // Validate amount
    const numericAmount = validateAmount(amount);
    const config = getConfig();
    const transferId = uuidv4();

    return await AppDataSource.transaction(async (manager) => {
      const walletRepo = manager.getRepository(Wallet);

      // Lock both wallets (order by ID to prevent deadlock)
      const walletIds = [sourceWalletId, destinationWalletId].sort();
      const wallets = await walletRepo
        .createQueryBuilder('wallet')
        .where('wallet.id IN (:...ids)', { ids: walletIds })
        .setLock('pessimistic_write')
        .getMany();

      const sourceWallet = wallets.find((w) => w.id === sourceWalletId);
      const destWallet = wallets.find((w) => w.id === destinationWalletId);

      if (!sourceWallet) {
        throw new NotFoundError('Source wallet', sourceWalletId);
      }

      if (!destWallet) {
        throw new NotFoundError('Destination wallet', destinationWalletId);
      }

      // Verify source wallet ownership
      if (sourceWallet.userId !== userId) {
        throw new ForbiddenError('You do not have permission to access the source wallet');
      }

      // Validate both wallets are active
      validateWalletActive(sourceWallet.status);
      validateWalletActive(destWallet.status);

      // Validate currencies match
      if (sourceWallet.currency !== destWallet.currency) {
        throw new CurrencyMismatchError();
      }

      // Validate transaction amount
      validateMaxTransactionAmount(numericAmount, sourceWallet.currency as Currency, config.limits.maxTransactionAmount);

      // Calculate balances
      const sourceCurrentBalance = parseFloat(sourceWallet.balance);
      const sourceNewBalance = sourceCurrentBalance - numericAmount;

      const destCurrentBalance = parseFloat(destWallet.balance);
      const destNewBalance = destCurrentBalance + numericAmount;

      // Check sufficient funds
      if (sourceNewBalance < 0) {
        throw new InsufficientFundsError(
          numericAmount.toFixed(2),
          sourceCurrentBalance.toFixed(2),
        );
      }

      // Validate destination balance doesn't exceed limit
      validateMaxWalletBalance(destNewBalance, destWallet.currency as Currency, config.limits.maxWalletBalance);

      // Update both wallet balances
      sourceWallet.balance = sourceNewBalance.toFixed(4);
      sourceWallet.updatedAt = new Date();
      await walletRepo.save(sourceWallet);

      destWallet.balance = destNewBalance.toFixed(4);
      destWallet.updatedAt = new Date();
      await walletRepo.save(destWallet);

      // Create transaction records
      const transactionRepo = manager.getRepository(Transaction);
      
      const sourceTransaction = transactionRepo.create({
        walletId: sourceWallet.id,
        relatedWalletId: destWallet.id,
        type: TransactionType.TRANSFER_DEBIT,
        amount: numericAmount.toFixed(4),
        currency: sourceWallet.currency,
        balanceBefore: sourceCurrentBalance.toFixed(4),
        balanceAfter: sourceNewBalance.toFixed(4),
        status: TransactionStatus.COMPLETED,
        idempotencyKey: idempotencyKey || null,
        metadata: { ...metadata, transferId },
      });
      const savedSourceTransaction = await transactionRepo.save(sourceTransaction);

      const destTransaction = transactionRepo.create({
        walletId: destWallet.id,
        relatedWalletId: sourceWallet.id,
        type: TransactionType.TRANSFER_CREDIT,
        amount: numericAmount.toFixed(4),
        currency: destWallet.currency,
        balanceBefore: destCurrentBalance.toFixed(4),
        balanceAfter: destNewBalance.toFixed(4),
        status: TransactionStatus.COMPLETED,
        idempotencyKey: null, // Only source has idempotency key
        metadata: { ...metadata, transferId },
      });
      const savedDestTransaction = await transactionRepo.save(destTransaction);

      // Publish transfer events to outbox
      const debitEvent = {
        eventType: 'funds.transfer.debited' as const,
        sourceWalletId: sourceWallet.id,
        destinationWalletId: destWallet.id,
        transferId,
        transactionId: savedSourceTransaction.id,
        amount: numericAmount.toFixed(2),
        currency: sourceWallet.currency,
        previousBalance: sourceCurrentBalance.toFixed(2),
        newBalance: sourceNewBalance.toFixed(2),
        timestamp: new Date().toISOString(),
        correlationId,
        metadata: metadata || undefined,
      };

      const creditEvent = {
        eventType: 'funds.transfer.credited' as const,
        sourceWalletId: sourceWallet.id,
        destinationWalletId: destWallet.id,
        transferId,
        transactionId: savedDestTransaction.id,
        amount: numericAmount.toFixed(2),
        currency: destWallet.currency,
        previousBalance: destCurrentBalance.toFixed(2),
        newBalance: destNewBalance.toFixed(2),
        timestamp: new Date().toISOString(),
        correlationId,
        metadata: metadata || undefined,
      };

      await this.eventService.publishToOutbox(manager, debitEvent);
      await this.eventService.publishToOutbox(manager, creditEvent);

      return {
        sourceTransaction: savedSourceTransaction,
        destinationTransaction: savedDestTransaction,
        transferId,
      };
    });
  }
}

