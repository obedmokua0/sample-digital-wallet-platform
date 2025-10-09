/**
 * Unit Tests for WalletService
 * Tests business logic in isolation with mocked dependencies
 */

// Mock dependencies BEFORE importing modules that use them
jest.mock('../../src/db/repositories/WalletRepository');
jest.mock('../../src/services/EventService');
jest.mock('../../src/db/connection', () => ({
  AppDataSource: {
    transaction: jest.fn(),
    initialize: jest.fn(),
  },
}));

import { WalletService } from '../../src/services/WalletService';
import { WalletRepository } from '../../src/db/repositories/WalletRepository';
import { EventService } from '../../src/services/EventService';
import { Wallet, WalletStatus } from '../../src/models/Wallet';
import { OutboxEvent } from '../../src/models/OutboxEvent';
import { ConflictError, NotFoundError, ForbiddenError, ValidationError } from '../../src/utils/errors';
import { AppDataSource } from '../../src/db/connection';

describe('WalletService', () => {
  let walletService: WalletService;
  let mockWalletRepository: jest.Mocked<WalletRepository>;
  let mockEventService: jest.Mocked<EventService>;
  let mockTransactionManager: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create service instance (mocks are auto-injected via constructor)
    walletService = new WalletService();

    // Get mocked instances
    mockWalletRepository = (walletService as any).walletRepository;
    mockEventService = (walletService as any).eventService;

    // Mock transaction manager
    mockTransactionManager = {
      create: jest.fn(),
      save: jest.fn(),
      getRepository: jest.fn(),
    };

    // Mock AppDataSource.transaction
    (AppDataSource.transaction as jest.Mock) = jest.fn(async (callback) => {
      return await callback(mockTransactionManager);
    });
  });

  describe('createWallet', () => {
    const userId = 'user-123';
    const currency = 'USD';
    const correlationId = 'corr-123';

    it('should create a new wallet successfully', async () => {
      const mockWallet: Wallet = {
        id: 'wallet-123',
        userId,
        balance: '0.0000',
        currency,
        status: WalletStatus.ACTIVE,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockOutboxEvent: OutboxEvent = {
        id: '1',
        eventType: 'wallet.created',
        aggregateId: mockWallet.id,
        payload: {},
        published: false,
        publishedAt: null,
        createdAt: new Date(),
      };

      // Mock repository response - no existing wallet
      mockWalletRepository.findByUserIdAndCurrency = jest.fn().mockResolvedValue(null);

      // Mock transaction manager
      mockTransactionManager.create.mockReturnValue(mockWallet);
      mockTransactionManager.save.mockResolvedValue(mockWallet);
      mockEventService.publishToOutbox.mockResolvedValue(mockOutboxEvent);

      const result = await walletService.createWallet(userId, currency, correlationId);

      expect(result).toEqual(mockWallet);
      expect(mockWalletRepository.findByUserIdAndCurrency).toHaveBeenCalledWith(userId, currency);
      expect(mockTransactionManager.create).toHaveBeenCalledWith(Wallet, {
        userId,
        currency,
        balance: '0.0000',
        status: WalletStatus.ACTIVE,
        version: 1,
      });
      expect(mockEventService.publishToOutbox).toHaveBeenCalledWith(
        mockTransactionManager,
        expect.objectContaining({
          eventType: 'wallet.created',
          walletId: mockWallet.id,
          userId,
          currency,
          initialBalance: '0.0000',
          correlationId,
        })
      );
    });

    it('should accept lowercase currency and convert to uppercase', async () => {
      const mockWallet: Wallet = {
        id: 'wallet-123',
        userId,
        balance: '0.0000',
        currency: 'EUR',
        status: WalletStatus.ACTIVE,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockOutboxEvent: OutboxEvent = {
        id: '2',
        eventType: 'wallet.created',
        aggregateId: mockWallet.id,
        payload: {},
        published: false,
        publishedAt: null,
        createdAt: new Date(),
      };

      mockWalletRepository.findByUserIdAndCurrency = jest.fn().mockResolvedValue(null);
      mockTransactionManager.create.mockReturnValue(mockWallet);
      mockTransactionManager.save.mockResolvedValue(mockWallet);
      mockEventService.publishToOutbox.mockResolvedValue(mockOutboxEvent);

      const result = await walletService.createWallet(userId, 'eur', correlationId);

      expect(result.currency).toBe('EUR');
      expect(mockWalletRepository.findByUserIdAndCurrency).toHaveBeenCalledWith(userId, 'EUR');
    });

    it('should throw ValidationError for invalid currency', async () => {
      await expect(
        walletService.createWallet(userId, 'INVALID', correlationId)
      ).rejects.toThrow(ValidationError);

      expect(mockWalletRepository.findByUserIdAndCurrency).not.toHaveBeenCalled();
    });

    it('should throw ConflictError if wallet already exists', async () => {
      const existingWallet: Wallet = {
        id: 'existing-wallet',
        userId,
        balance: '100.0000',
        currency,
        status: WalletStatus.ACTIVE,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockWalletRepository.findByUserIdAndCurrency = jest.fn().mockResolvedValue(existingWallet);

      await expect(
        walletService.createWallet(userId, currency, correlationId)
      ).rejects.toThrow(ConflictError);

      expect(mockTransactionManager.create).not.toHaveBeenCalled();
    });

    it('should publish wallet.created event within same transaction', async () => {
      const mockWallet: Wallet = {
        id: 'wallet-123',
        userId,
        balance: '0.0000',
        currency,
        status: WalletStatus.ACTIVE,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockOutboxEvent: OutboxEvent = {
        id: '3',
        eventType: 'wallet.created',
        aggregateId: mockWallet.id,
        payload: {},
        published: false,
        publishedAt: null,
        createdAt: new Date(),
      };

      mockWalletRepository.findByUserIdAndCurrency = jest.fn().mockResolvedValue(null);
      mockTransactionManager.create.mockReturnValue(mockWallet);
      mockTransactionManager.save.mockResolvedValue(mockWallet);
      mockEventService.publishToOutbox.mockResolvedValue(mockOutboxEvent);

      await walletService.createWallet(userId, currency, correlationId);

      expect(mockEventService.publishToOutbox).toHaveBeenCalledTimes(1);
      expect(mockEventService.publishToOutbox).toHaveBeenCalledWith(
        mockTransactionManager,
        expect.objectContaining({
          eventType: 'wallet.created',
          correlationId,
        })
      );
    });
  });

  describe('getWallet', () => {
    const walletId = 'wallet-123';
    const userId = 'user-123';

    it('should return wallet for valid owner', async () => {
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

      mockWalletRepository.findById = jest.fn().mockResolvedValue(mockWallet);

      const result = await walletService.getWallet(walletId, userId);

      expect(result).toEqual(mockWallet);
      expect(mockWalletRepository.findById).toHaveBeenCalledWith(walletId);
    });

    it('should throw NotFoundError if wallet does not exist', async () => {
      mockWalletRepository.findById = jest.fn().mockResolvedValue(null);

      await expect(
        walletService.getWallet(walletId, userId)
      ).rejects.toThrow(NotFoundError);

      expect(mockWalletRepository.findById).toHaveBeenCalledWith(walletId);
    });

    it('should throw ForbiddenError if user does not own the wallet', async () => {
      const mockWallet: Wallet = {
        id: walletId,
        userId: 'different-user',
        balance: '100.5000',
        currency: 'USD',
        status: WalletStatus.ACTIVE,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockWalletRepository.findById = jest.fn().mockResolvedValue(mockWallet);

      await expect(
        walletService.getWallet(walletId, userId)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should allow access to own wallet regardless of status', async () => {
      const statuses = [WalletStatus.ACTIVE, WalletStatus.FROZEN, WalletStatus.CLOSED];

      for (const status of statuses) {
        const mockWallet: Wallet = {
          id: walletId,
          userId,
          balance: '100.5000',
          currency: 'USD',
          status,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockWalletRepository.findById = jest.fn().mockResolvedValue(mockWallet);

        const result = await walletService.getWallet(walletId, userId);
        expect(result.status).toBe(status);
      }
    });
  });

  describe('getBalance', () => {
    const walletId = 'wallet-123';
    const userId = 'user-123';

    it('should return formatted balance information', async () => {
      const mockWallet: Wallet = {
        id: walletId,
        userId,
        balance: '1234.5678',
        currency: 'USD',
        status: WalletStatus.ACTIVE,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockWalletRepository.findById = jest.fn().mockResolvedValue(mockWallet);

      const result = await walletService.getBalance(walletId, userId);

      expect(result).toMatchObject({
        walletId,
        balance: '1234.57', // Rounded to 2 decimal places
        currency: 'USD',
      });
      expect(result.asOf).toBeDefined();
      expect(typeof result.asOf).toBe('string');
    });

    it('should format zero balance correctly', async () => {
      const mockWallet: Wallet = {
        id: walletId,
        userId,
        balance: '0.0000',
        currency: 'EUR',
        status: WalletStatus.ACTIVE,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockWalletRepository.findById = jest.fn().mockResolvedValue(mockWallet);

      const result = await walletService.getBalance(walletId, userId);

      expect(result.balance).toBe('0.00');
    });

    it('should throw NotFoundError if wallet does not exist', async () => {
      mockWalletRepository.findById = jest.fn().mockResolvedValue(null);

      await expect(
        walletService.getBalance(walletId, userId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError if user does not own the wallet', async () => {
      const mockWallet: Wallet = {
        id: walletId,
        userId: 'different-user',
        balance: '100.0000',
        currency: 'USD',
        status: WalletStatus.ACTIVE,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockWalletRepository.findById = jest.fn().mockResolvedValue(mockWallet);

      await expect(
        walletService.getBalance(walletId, userId)
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('getUserWallets', () => {
    const userId = 'user-123';

    it('should return all wallets for a user', async () => {
      const mockWallets: Wallet[] = [
        {
          id: 'wallet-1',
          userId,
          balance: '100.0000',
          currency: 'USD',
          status: WalletStatus.ACTIVE,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'wallet-2',
          userId,
          balance: '200.0000',
          currency: 'EUR',
          status: WalletStatus.ACTIVE,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockWalletRepository.findByUserId = jest.fn().mockResolvedValue(mockWallets);

      const result = await walletService.getUserWallets(userId);

      expect(result).toEqual(mockWallets);
      expect(result).toHaveLength(2);
      expect(mockWalletRepository.findByUserId).toHaveBeenCalledWith(userId);
    });

    it('should return empty array if user has no wallets', async () => {
      mockWalletRepository.findByUserId = jest.fn().mockResolvedValue([]);

      const result = await walletService.getUserWallets(userId);

      expect(result).toEqual([]);
      expect(mockWalletRepository.findByUserId).toHaveBeenCalledWith(userId);
    });

    it('should return wallets with all statuses', async () => {
      const mockWallets: Wallet[] = [
        {
          id: 'wallet-1',
          userId,
          balance: '100.0000',
          currency: 'USD',
          status: WalletStatus.ACTIVE,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'wallet-2',
          userId,
          balance: '200.0000',
          currency: 'EUR',
          status: WalletStatus.FROZEN,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'wallet-3',
          userId,
          balance: '0.0000',
          currency: 'GBP',
          status: WalletStatus.CLOSED,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockWalletRepository.findByUserId = jest.fn().mockResolvedValue(mockWallets);

      const result = await walletService.getUserWallets(userId);

      expect(result).toHaveLength(3);
      expect(result.map(w => w.status)).toEqual([WalletStatus.ACTIVE, WalletStatus.FROZEN, WalletStatus.CLOSED]);
    });
  });
});

