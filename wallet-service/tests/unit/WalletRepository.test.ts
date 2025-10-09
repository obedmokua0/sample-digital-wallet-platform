/**
 * Unit Tests for WalletRepository
 * Tests data access layer methods with mocked TypeORM repository
 */

// Mock dependencies BEFORE importing modules
jest.mock('../../src/db/connection', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

import { WalletRepository } from '../../src/db/repositories/WalletRepository';
import { Wallet, WalletStatus } from '../../src/models/Wallet';
import { AppDataSource } from '../../src/db/connection';
import { Repository } from 'typeorm';

describe('WalletRepository', () => {
  let walletRepository: WalletRepository;
  let mockRepository: jest.Mocked<Repository<Wallet>>;

  beforeEach(() => {
    // Create mock repository
    mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<Repository<Wallet>>;

    // Mock AppDataSource.getRepository
    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepository);

    // Create repository instance
    walletRepository = new WalletRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new wallet with default values', async () => {
      const userId = 'user-123';
      const currency = 'USD' as const;
      const mockWallet: Wallet = {
        id: 'wallet-123',
        userId,
        currency,
        balance: '0.0000',
        status: WalletStatus.ACTIVE,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.create.mockReturnValue(mockWallet);
      mockRepository.save.mockResolvedValue(mockWallet);

      const result = await walletRepository.create(userId, currency);

      expect(mockRepository.create).toHaveBeenCalledWith({
        userId,
        currency,
        balance: '0.0000',
        status: WalletStatus.ACTIVE,
        version: 1,
      });
      expect(mockRepository.save).toHaveBeenCalledWith(mockWallet);
      expect(result).toEqual(mockWallet);
    });
  });

  describe('findById', () => {
    it('should find wallet by ID', async () => {
      const walletId = 'wallet-123';
      const mockWallet: Wallet = {
        id: walletId,
        userId: 'user-123',
        currency: 'USD',
        balance: '100.0000',
        status: WalletStatus.ACTIVE,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(mockWallet);

      const result = await walletRepository.findById(walletId);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: walletId },
      });
      expect(result).toEqual(mockWallet);
    });

    it('should return null if wallet not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await walletRepository.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findByIdForUpdate', () => {
    it('should find wallet with pessimistic lock', async () => {
      const walletId = 'wallet-123';
      const mockWallet: Wallet = {
        id: walletId,
        userId: 'user-123',
        currency: 'USD',
        balance: '100.0000',
        status: WalletStatus.ACTIVE,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(mockWallet);

      const result = await walletRepository.findByIdForUpdate(walletId);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: walletId },
        lock: { mode: 'pessimistic_write' },
      });
      expect(result).toEqual(mockWallet);
    });
  });

  describe('findByUserId', () => {
    it('should find all wallets for a user ordered by creation date', async () => {
      const userId = 'user-123';
      const mockWallets: Wallet[] = [
        {
          id: 'wallet-1',
          userId,
          currency: 'USD',
          balance: '100.0000',
          status: WalletStatus.ACTIVE,
          version: 1,
          createdAt: new Date('2025-01-02'),
          updatedAt: new Date(),
        },
        {
          id: 'wallet-2',
          userId,
          currency: 'EUR',
          balance: '200.0000',
          status: WalletStatus.ACTIVE,
          version: 1,
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date(),
        },
      ];

      mockRepository.find.mockResolvedValue(mockWallets);

      const result = await walletRepository.findByUserId(userId);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { userId },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(mockWallets);
    });

    it('should return empty array if user has no wallets', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await walletRepository.findByUserId('user-no-wallets');

      expect(result).toEqual([]);
    });
  });

  describe('findByUserIdAndCurrency', () => {
    it('should find wallet by user ID and currency', async () => {
      const userId = 'user-123';
      const currency = 'USD' as const;
      const mockWallet: Wallet = {
        id: 'wallet-123',
        userId,
        currency,
        balance: '100.0000',
        status: WalletStatus.ACTIVE,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(mockWallet);

      const result = await walletRepository.findByUserIdAndCurrency(userId, currency);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { userId, currency },
      });
      expect(result).toEqual(mockWallet);
    });

    it('should return null if no wallet found for user and currency', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await walletRepository.findByUserIdAndCurrency('user-123', 'EUR' as const);

      expect(result).toBeNull();
    });
  });

  describe('updateBalance', () => {
    it('should update wallet balance and updated timestamp', async () => {
      const walletId = 'wallet-123';
      const newBalance = '250.5000';

      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      await walletRepository.updateBalance(walletId, newBalance);

      expect(mockRepository.update).toHaveBeenCalledWith(
        { id: walletId },
        expect.objectContaining({
          balance: newBalance,
          updatedAt: expect.any(Date),
        })
      );
    });
  });

  describe('updateStatus', () => {
    it('should update wallet status', async () => {
      const walletId = 'wallet-123';
      const newStatus = WalletStatus.FROZEN;

      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      await walletRepository.updateStatus(walletId, newStatus);

      expect(mockRepository.update).toHaveBeenCalledWith(
        { id: walletId },
        expect.objectContaining({
          status: newStatus,
          updatedAt: expect.any(Date),
        })
      );
    });
  });

  describe('save', () => {
    it('should save wallet entity', async () => {
      const mockWallet: Wallet = {
        id: 'wallet-123',
        userId: 'user-123',
        currency: 'USD',
        balance: '100.0000',
        status: WalletStatus.ACTIVE,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.save.mockResolvedValue(mockWallet);

      const result = await walletRepository.save(mockWallet);

      expect(mockRepository.save).toHaveBeenCalledWith(mockWallet);
      expect(result).toEqual(mockWallet);
    });
  });
});

