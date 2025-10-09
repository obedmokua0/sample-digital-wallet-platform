/**
 * Unit Tests for TransactionService
 * Tests business logic for deposits, withdrawals, and transfers
 */

// Mock dependencies BEFORE importing modules that use them
jest.mock('../../src/db/repositories/TransactionRepository');
jest.mock('../../src/services/EventService');
jest.mock('../../src/db/connection', () => ({
  AppDataSource: {
    transaction: jest.fn(),
    initialize: jest.fn(),
  },
}));
jest.mock('../../src/config');

import { TransactionService } from '../../src/services/TransactionService';
import { TransactionRepository } from '../../src/db/repositories/TransactionRepository';
import { EventService } from '../../src/services/EventService';
import { Wallet, WalletStatus } from '../../src/models/Wallet';
import { Transaction, TransactionType, TransactionStatus } from '../../src/models/Transaction';
import { OutboxEvent } from '../../src/models/OutboxEvent';
import {
  NotFoundError,
  ForbiddenError,
  InsufficientFundsError,
  InvalidTransferError,
  CurrencyMismatchError,
  ValidationError,
} from '../../src/utils/errors';
import { AppDataSource } from '../../src/db/connection';
import { getConfig } from '../../src/config';

describe('TransactionService', () => {
  let transactionService: TransactionService;
  let mockTransactionRepository: jest.Mocked<TransactionRepository>;
  let mockEventService: jest.Mocked<EventService>;
  let mockTransactionManager: any;
  let mockWalletRepo: any;
  let mockTransactionRepo: any;
  let mockOutboxEvent: OutboxEvent;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock config
    (getConfig as jest.Mock).mockReturnValue({
      limits: {
        maxTransactionAmount: {
          USD: 10000,
          EUR: 9000,
          GBP: 8000,
        },
        maxWalletBalance: {
          USD: 100000,
          EUR: 90000,
          GBP: 80000,
        },
      },
    });

    // Create service instance
    transactionService = new TransactionService();

    // Get mocked instances
    mockTransactionRepository = (transactionService as any).transactionRepository;
    mockEventService = (transactionService as any).eventService;

    // Mock outbox event
    mockOutboxEvent = {
      id: '1',
      eventType: 'test.event',
      aggregateId: 'test-id',
      payload: {},
      published: false,
      publishedAt: null,
      createdAt: new Date(),
    };

    // Mock repository methods
    mockWalletRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    mockTransactionRepo = {
      create: jest.fn(),
      save: jest.fn(),
    };

    // Mock transaction manager
    mockTransactionManager = {
      getRepository: jest.fn((entity) => {
        if (entity === Wallet) return mockWalletRepo;
        if (entity === Transaction) return mockTransactionRepo;
        return null;
      }),
    };

    // Mock AppDataSource.transaction
    (AppDataSource.transaction as jest.Mock) = jest.fn(async (callback) => {
      return await callback(mockTransactionManager);
    });
  });

  describe('deposit', () => {
    const walletId = 'wallet-123';
    const userId = 'user-123';
    const amount = '100.50';
    const idempotencyKey = 'idem-123';
    const correlationId = 'corr-123';

    it('should deposit funds successfully', async () => {
      const mockWallet: Wallet = {
        id: walletId,
        userId,
        balance: '500.0000',
        currency: 'USD',
        status: WalletStatus.ACTIVE,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockTransaction: Transaction = {
        id: 'txn-123',
        walletId,
        relatedWalletId: null,
        type: TransactionType.DEPOSIT,
        amount: '100.5000',
        currency: 'USD',
        balanceBefore: '500.0000',
        balanceAfter: '600.5000',
        status: TransactionStatus.COMPLETED,
        idempotencyKey,
        metadata: null,
        createdAt: new Date(),
      };

      mockTransactionRepository.findByIdempotencyKey = jest.fn().mockResolvedValue(null);
      mockWalletRepo.findOne.mockResolvedValue(mockWallet);
      mockWalletRepo.save.mockResolvedValue({ ...mockWallet, balance: '600.5000' });
      mockTransactionRepo.create.mockReturnValue(mockTransaction);
      mockTransactionRepo.save.mockResolvedValue(mockTransaction);
      mockEventService.publishToOutbox.mockResolvedValue(mockOutboxEvent);

      const result = await transactionService.deposit(
        walletId,
        amount,
        userId,
        idempotencyKey,
        correlationId
      );

      expect(result).toEqual(mockTransaction);
      expect(mockWalletRepo.findOne).toHaveBeenCalledWith({
        where: { id: walletId },
        lock: { mode: 'pessimistic_write' },
      });
      expect(mockWalletRepo.save).toHaveBeenCalled();
      expect(mockEventService.publishToOutbox).toHaveBeenCalledWith(
        mockTransactionManager,
        expect.objectContaining({
          eventType: 'funds.deposited',
          walletId,
          amount: '100.50',
        })
      );
    });

    it('should return existing transaction if idempotency key exists', async () => {
      const existingTransaction: Transaction = {
        id: 'existing-txn',
        walletId,
        relatedWalletId: null,
        type: TransactionType.DEPOSIT,
        amount: '100.5000',
        currency: 'USD',
        balanceBefore: '500.0000',
        balanceAfter: '600.5000',
        status: TransactionStatus.COMPLETED,
        idempotencyKey,
        metadata: null,
        createdAt: new Date(),
      };

      mockTransactionRepository.findByIdempotencyKey = jest.fn().mockResolvedValue(existingTransaction);

      const result = await transactionService.deposit(
        walletId,
        amount,
        userId,
        idempotencyKey,
        correlationId
      );

      expect(result).toEqual(existingTransaction);
      expect(mockWalletRepo.findOne).not.toHaveBeenCalled();
    });

    it('should throw ValidationError for invalid amount', async () => {
      await expect(
        transactionService.deposit(walletId, 'invalid', userId, null, correlationId)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError if wallet does not exist', async () => {
      mockTransactionRepository.findByIdempotencyKey = jest.fn().mockResolvedValue(null);
      mockWalletRepo.findOne.mockResolvedValue(null);

      await expect(
        transactionService.deposit(walletId, amount, userId, null, correlationId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError if user does not own wallet', async () => {
      const mockWallet: Wallet = {
        id: walletId,
        userId: 'different-user',
        balance: '500.0000',
        currency: 'USD',
        status: WalletStatus.ACTIVE,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTransactionRepository.findByIdempotencyKey = jest.fn().mockResolvedValue(null);
      mockWalletRepo.findOne.mockResolvedValue(mockWallet);

      await expect(
        transactionService.deposit(walletId, amount, userId, null, correlationId)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw ValidationError if wallet is not active', async () => {
      const mockWallet: Wallet = {
        id: walletId,
        userId,
        balance: '500.0000',
        currency: 'USD',
        status: WalletStatus.FROZEN,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTransactionRepository.findByIdempotencyKey = jest.fn().mockResolvedValue(null);
      mockWalletRepo.findOne.mockResolvedValue(mockWallet);

      await expect(
        transactionService.deposit(walletId, amount, userId, null, correlationId)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError if deposit exceeds max transaction amount', async () => {
      const largeAmount = '15000'; // Exceeds USD limit of 10000

      const mockWallet: Wallet = {
        id: walletId,
        userId,
        balance: '500.0000',
        currency: 'USD',
        status: WalletStatus.ACTIVE,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTransactionRepository.findByIdempotencyKey = jest.fn().mockResolvedValue(null);
      mockWalletRepo.findOne.mockResolvedValue(mockWallet);

      await expect(
        transactionService.deposit(walletId, largeAmount, userId, null, correlationId)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError if resulting balance exceeds max wallet balance', async () => {
      const mockWallet: Wallet = {
        id: walletId,
        userId,
        balance: '99500.0000', // Close to limit
        currency: 'USD',
        status: WalletStatus.ACTIVE,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTransactionRepository.findByIdempotencyKey = jest.fn().mockResolvedValue(null);
      mockWalletRepo.findOne.mockResolvedValue(mockWallet);

      await expect(
        transactionService.deposit(walletId, '1000', userId, null, correlationId) // Would exceed 100000
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('withdraw', () => {
    const walletId = 'wallet-123';
    const userId = 'user-123';
    const amount = '100.50';
    const idempotencyKey = 'idem-456';
    const correlationId = 'corr-456';

    it('should withdraw funds successfully', async () => {
      const mockWallet: Wallet = {
        id: walletId,
        userId,
        balance: '500.0000',
        currency: 'USD',
        status: WalletStatus.ACTIVE,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockTransaction: Transaction = {
        id: 'txn-456',
        walletId,
        relatedWalletId: null,
        type: TransactionType.WITHDRAWAL,
        amount: '100.5000',
        currency: 'USD',
        balanceBefore: '500.0000',
        balanceAfter: '399.5000',
        status: TransactionStatus.COMPLETED,
        idempotencyKey,
        metadata: null,
        createdAt: new Date(),
      };

      mockTransactionRepository.findByIdempotencyKey = jest.fn().mockResolvedValue(null);
      mockWalletRepo.findOne.mockResolvedValue(mockWallet);
      mockWalletRepo.save.mockResolvedValue({ ...mockWallet, balance: '399.5000' });
      mockTransactionRepo.create.mockReturnValue(mockTransaction);
      mockTransactionRepo.save.mockResolvedValue(mockTransaction);
      mockEventService.publishToOutbox.mockResolvedValue(mockOutboxEvent);

      const result = await transactionService.withdraw(
        walletId,
        amount,
        userId,
        idempotencyKey,
        correlationId
      );

      expect(result).toEqual(mockTransaction);
      expect(mockEventService.publishToOutbox).toHaveBeenCalledWith(
        mockTransactionManager,
        expect.objectContaining({
          eventType: 'funds.withdrawn',
          walletId,
          amount: '100.50',
        })
      );
    });

    it('should throw InsufficientFundsError if balance is too low', async () => {
      const mockWallet: Wallet = {
        id: walletId,
        userId,
        balance: '50.0000', // Less than withdrawal amount
        currency: 'USD',
        status: WalletStatus.ACTIVE,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTransactionRepository.findByIdempotencyKey = jest.fn().mockResolvedValue(null);
      mockWalletRepo.findOne.mockResolvedValue(mockWallet);

      await expect(
        transactionService.withdraw(walletId, amount, userId, null, correlationId)
      ).rejects.toThrow(InsufficientFundsError);
    });

    it('should allow withdrawal that brings balance to exactly zero', async () => {
      const mockWallet: Wallet = {
        id: walletId,
        userId,
        balance: '100.5000',
        currency: 'USD',
        status: WalletStatus.ACTIVE,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockTransaction: Transaction = {
        id: 'txn-789',
        walletId,
        relatedWalletId: null,
        type: TransactionType.WITHDRAWAL,
        amount: '100.5000',
        currency: 'USD',
        balanceBefore: '100.5000',
        balanceAfter: '0.0000',
        status: TransactionStatus.COMPLETED,
        idempotencyKey: null,
        metadata: null,
        createdAt: new Date(),
      };

      mockTransactionRepository.findByIdempotencyKey = jest.fn().mockResolvedValue(null);
      mockWalletRepo.findOne.mockResolvedValue(mockWallet);
      mockWalletRepo.save.mockResolvedValue({ ...mockWallet, balance: '0.0000' });
      mockTransactionRepo.create.mockReturnValue(mockTransaction);
      mockTransactionRepo.save.mockResolvedValue(mockTransaction);
      mockEventService.publishToOutbox.mockResolvedValue(mockOutboxEvent);

      const result = await transactionService.withdraw(
        walletId,
        '100.50',
        userId,
        null,
        correlationId
      );

      expect(result.balanceAfter).toBe('0.0000');
    });
  });

  describe('transfer', () => {
    const sourceWalletId = 'wallet-source';
    const destWalletId = 'wallet-dest';
    const userId = 'user-123';
    const amount = '100.00';
    const idempotencyKey = 'idem-transfer';
    const correlationId = 'corr-transfer';

    it('should transfer funds between wallets successfully', async () => {
      const mockSourceWallet: Wallet = {
        id: sourceWalletId,
        userId,
        balance: '500.0000',
        currency: 'USD',
        status: WalletStatus.ACTIVE,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockDestWallet: Wallet = {
        id: destWalletId,
        userId: 'user-456',
        balance: '200.0000',
        currency: 'USD',
        status: WalletStatus.ACTIVE,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSourceTransaction: Transaction = {
        id: 'txn-source',
        walletId: sourceWalletId,
        relatedWalletId: destWalletId,
        type: TransactionType.TRANSFER_DEBIT,
        amount: '100.0000',
        currency: 'USD',
        balanceBefore: '500.0000',
        balanceAfter: '400.0000',
        status: TransactionStatus.COMPLETED,
        idempotencyKey,
        metadata: { transferId: expect.any(String) },
        createdAt: new Date(),
      };

      const mockDestTransaction: Transaction = {
        id: 'txn-dest',
        walletId: destWalletId,
        relatedWalletId: sourceWalletId,
        type: TransactionType.TRANSFER_CREDIT,
        amount: '100.0000',
        currency: 'USD',
        balanceBefore: '200.0000',
        balanceAfter: '300.0000',
        status: TransactionStatus.COMPLETED,
        idempotencyKey: null,
        metadata: { transferId: expect.any(String) },
        createdAt: new Date(),
      };

      mockTransactionRepository.findByIdempotencyKey = jest.fn().mockResolvedValue(null);

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockSourceWallet, mockDestWallet]),
      };

      mockWalletRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockWalletRepo.save.mockImplementation((wallet: Wallet) => Promise.resolve(wallet));
      mockTransactionRepo.create.mockImplementation((data: Partial<Transaction>) => data);
      mockTransactionRepo.save
        .mockResolvedValueOnce(mockSourceTransaction)
        .mockResolvedValueOnce(mockDestTransaction);
      mockEventService.publishToOutbox.mockResolvedValue(mockOutboxEvent);

      const result = await transactionService.transfer(
        sourceWalletId,
        destWalletId,
        amount,
        userId,
        idempotencyKey,
        correlationId
      );

      expect(result).toHaveProperty('sourceTransaction');
      expect(result).toHaveProperty('destinationTransaction');
      expect(result).toHaveProperty('transferId');
      expect(mockEventService.publishToOutbox).toHaveBeenCalledTimes(2);
    });

    it('should throw InvalidTransferError when transferring to same wallet', async () => {
      mockTransactionRepository.findByIdempotencyKey = jest.fn().mockResolvedValue(null);

      await expect(
        transactionService.transfer(
          sourceWalletId,
          sourceWalletId, // Same wallet
          amount,
          userId,
          null,
          correlationId
        )
      ).rejects.toThrow(InvalidTransferError);
    });

    it('should throw NotFoundError if source wallet does not exist', async () => {
      const mockDestWallet: Wallet = {
        id: destWalletId,
        userId: 'user-456',
        balance: '200.0000',
        currency: 'USD',
        status: WalletStatus.ACTIVE,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTransactionRepository.findByIdempotencyKey = jest.fn().mockResolvedValue(null);

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockDestWallet]), // Only dest wallet
      };

      mockWalletRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await expect(
        transactionService.transfer(
          sourceWalletId,
          destWalletId,
          amount,
          userId,
          null,
          correlationId
        )
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError if user does not own source wallet', async () => {
      const mockSourceWallet: Wallet = {
        id: sourceWalletId,
        userId: 'different-user', // Not the requesting user
        balance: '500.0000',
        currency: 'USD',
        status: WalletStatus.ACTIVE,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockDestWallet: Wallet = {
        id: destWalletId,
        userId: 'user-456',
        balance: '200.0000',
        currency: 'USD',
        status: WalletStatus.ACTIVE,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTransactionRepository.findByIdempotencyKey = jest.fn().mockResolvedValue(null);

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockSourceWallet, mockDestWallet]),
      };

      mockWalletRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await expect(
        transactionService.transfer(
          sourceWalletId,
          destWalletId,
          amount,
          userId,
          null,
          correlationId
        )
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw CurrencyMismatchError if wallet currencies differ', async () => {
      const mockSourceWallet: Wallet = {
        id: sourceWalletId,
        userId,
        balance: '500.0000',
        currency: 'USD',
        status: WalletStatus.ACTIVE,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockDestWallet: Wallet = {
        id: destWalletId,
        userId: 'user-456',
        balance: '200.0000',
        currency: 'EUR', // Different currency
        status: WalletStatus.ACTIVE,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTransactionRepository.findByIdempotencyKey = jest.fn().mockResolvedValue(null);

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockSourceWallet, mockDestWallet]),
      };

      mockWalletRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await expect(
        transactionService.transfer(
          sourceWalletId,
          destWalletId,
          amount,
          userId,
          null,
          correlationId
        )
      ).rejects.toThrow(CurrencyMismatchError);
    });

    it('should throw InsufficientFundsError if source balance is too low', async () => {
      const mockSourceWallet: Wallet = {
        id: sourceWalletId,
        userId,
        balance: '50.0000', // Less than transfer amount
        currency: 'USD',
        status: WalletStatus.ACTIVE,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockDestWallet: Wallet = {
        id: destWalletId,
        userId: 'user-456',
        balance: '200.0000',
        currency: 'USD',
        status: WalletStatus.ACTIVE,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTransactionRepository.findByIdempotencyKey = jest.fn().mockResolvedValue(null);

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockSourceWallet, mockDestWallet]),
      };

      mockWalletRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await expect(
        transactionService.transfer(
          sourceWalletId,
          destWalletId,
          amount,
          userId,
          null,
          correlationId
        )
      ).rejects.toThrow(InsufficientFundsError);
    });

    it('should lock wallets in sorted order to prevent deadlock', async () => {
      const wallet1 = 'aaaaa-wallet-1';
      const wallet2 = 'zzzzz-wallet-2';

      mockTransactionRepository.findByIdempotencyKey = jest.fn().mockResolvedValue(null);

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockWalletRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      try {
        await transactionService.transfer(
          wallet2, // Higher ID
          wallet1, // Lower ID
          amount,
          userId,
          null,
          correlationId
        );
      } catch {
        // Expected to fail, we're just checking the lock order
      }

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'wallet.id IN (:...ids)',
        { ids: [wallet1, wallet2] } // Should be sorted
      );
    });
  });
});

