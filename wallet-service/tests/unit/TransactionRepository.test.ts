/**
 * Unit Tests for TransactionRepository
 * Tests data access layer methods with mocked TypeORM repository
 */

// Mock dependencies BEFORE importing modules
jest.mock('../../src/db/connection', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

import { TransactionRepository, TransactionFilters, PaginationOptions } from '../../src/db/repositories/TransactionRepository';
import { Transaction, TransactionType, TransactionStatus } from '../../src/models/Transaction';
import { AppDataSource } from '../../src/db/connection';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';

describe('TransactionRepository', () => {
  let transactionRepository: TransactionRepository;
  let mockRepository: jest.Mocked<Repository<Transaction>>;

  beforeEach(() => {
    // Create mock repository
    mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
    } as unknown as jest.Mocked<Repository<Transaction>>;

    // Mock AppDataSource.getRepository
    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepository);

    // Create repository instance
    transactionRepository = new TransactionRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new transaction', async () => {
      const transactionData = {
        walletId: 'wallet-123',
        relatedWalletId: null,
        type: TransactionType.DEPOSIT,
        amount: '100.0000',
        currency: 'USD',
        balanceBefore: '0.0000',
        balanceAfter: '100.0000',
        status: TransactionStatus.COMPLETED,
        idempotencyKey: 'idem-123',
        metadata: { source: 'test' },
      };

      const mockTransaction: Transaction = {
        id: 'txn-123',
        ...transactionData,
        createdAt: new Date(),
      };

      mockRepository.create.mockReturnValue(mockTransaction);
      mockRepository.save.mockResolvedValue(mockTransaction);

      const result = await transactionRepository.create(transactionData);

      expect(mockRepository.create).toHaveBeenCalledWith(transactionData);
      expect(mockRepository.save).toHaveBeenCalledWith(mockTransaction);
      expect(result).toEqual(mockTransaction);
    });
  });

  describe('findById', () => {
    it('should find transaction by ID', async () => {
      const transactionId = 'txn-123';
      const mockTransaction: Transaction = {
        id: transactionId,
        walletId: 'wallet-123',
        relatedWalletId: null,
        type: TransactionType.DEPOSIT,
        amount: '100.0000',
        currency: 'USD',
        balanceBefore: '0.0000',
        balanceAfter: '100.0000',
        status: TransactionStatus.COMPLETED,
        idempotencyKey: null,
        metadata: null,
        createdAt: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(mockTransaction);

      const result = await transactionRepository.findById(transactionId);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: transactionId },
      });
      expect(result).toEqual(mockTransaction);
    });

    it('should return null if transaction not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await transactionRepository.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findByIdempotencyKey', () => {
    it('should find transaction by idempotency key', async () => {
      const idempotencyKey = 'idem-123';
      const mockTransaction: Transaction = {
        id: 'txn-123',
        walletId: 'wallet-123',
        relatedWalletId: null,
        type: TransactionType.DEPOSIT,
        amount: '100.0000',
        currency: 'USD',
        balanceBefore: '0.0000',
        balanceAfter: '100.0000',
        status: TransactionStatus.COMPLETED,
        idempotencyKey,
        metadata: null,
        createdAt: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(mockTransaction);

      const result = await transactionRepository.findByIdempotencyKey(idempotencyKey);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { idempotencyKey },
      });
      expect(result).toEqual(mockTransaction);
    });

    it('should return null if no transaction with idempotency key exists', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await transactionRepository.findByIdempotencyKey('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findByWalletId', () => {
    const walletId = 'wallet-123';
    const pagination: PaginationOptions = { page: 1, pageSize: 10 };

    it('should find transactions for a wallet with pagination', async () => {
      const mockTransactions: Transaction[] = [
        {
          id: 'txn-1',
          walletId,
          relatedWalletId: null,
          type: TransactionType.DEPOSIT,
          amount: '100.0000',
          currency: 'USD',
          balanceBefore: '0.0000',
          balanceAfter: '100.0000',
          status: TransactionStatus.COMPLETED,
          idempotencyKey: null,
          metadata: null,
          createdAt: new Date(),
        },
      ];

      mockRepository.find.mockResolvedValue(mockTransactions);

      const result = await transactionRepository.findByWalletId(walletId, pagination);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { walletId },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 10,
      });
      expect(result).toEqual(mockTransactions);
    });

    it('should apply type filter', async () => {
      const filters: TransactionFilters = { type: TransactionType.DEPOSIT };
      mockRepository.find.mockResolvedValue([]);

      await transactionRepository.findByWalletId(walletId, pagination, filters);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { walletId, type: TransactionType.DEPOSIT },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 10,
      });
    });

    it('should apply date range filter', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');
      const filters: TransactionFilters = { startDate, endDate };
      mockRepository.find.mockResolvedValue([]);

      await transactionRepository.findByWalletId(walletId, pagination, filters);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          walletId,
          createdAt: Between(startDate, endDate),
        },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 10,
      });
    });

    it('should apply start date filter only', async () => {
      const startDate = new Date('2025-01-01');
      const filters: TransactionFilters = { startDate };
      mockRepository.find.mockResolvedValue([]);

      await transactionRepository.findByWalletId(walletId, pagination, filters);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          walletId,
          createdAt: MoreThanOrEqual(startDate),
        },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 10,
      });
    });

    it('should apply end date filter only', async () => {
      const endDate = new Date('2025-01-31');
      const filters: TransactionFilters = { endDate };
      mockRepository.find.mockResolvedValue([]);

      await transactionRepository.findByWalletId(walletId, pagination, filters);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          walletId,
          createdAt: LessThanOrEqual(endDate),
        },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 10,
      });
    });

    it('should calculate correct skip for page 2', async () => {
      const page2Pagination: PaginationOptions = { page: 2, pageSize: 10 };
      mockRepository.find.mockResolvedValue([]);

      await transactionRepository.findByWalletId(walletId, page2Pagination);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { walletId },
        order: { createdAt: 'DESC' },
        skip: 10,
        take: 10,
      });
    });
  });

  describe('countByWalletId', () => {
    const walletId = 'wallet-123';

    it('should count transactions for a wallet', async () => {
      mockRepository.count.mockResolvedValue(5);

      const result = await transactionRepository.countByWalletId(walletId);

      expect(mockRepository.count).toHaveBeenCalledWith({
        where: { walletId },
      });
      expect(result).toBe(5);
    });

    it('should apply type filter when counting', async () => {
      const filters: TransactionFilters = { type: TransactionType.WITHDRAWAL };
      mockRepository.count.mockResolvedValue(2);

      const result = await transactionRepository.countByWalletId(walletId, filters);

      expect(mockRepository.count).toHaveBeenCalledWith({
        where: { walletId, type: TransactionType.WITHDRAWAL },
      });
      expect(result).toBe(2);
    });

    it('should apply date range filter when counting', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');
      const filters: TransactionFilters = { startDate, endDate };
      mockRepository.count.mockResolvedValue(3);

      await transactionRepository.countByWalletId(walletId, filters);

      expect(mockRepository.count).toHaveBeenCalledWith({
        where: {
          walletId,
          createdAt: Between(startDate, endDate),
        },
      });
    });
  });

  describe('save', () => {
    it('should save transaction entity', async () => {
      const mockTransaction: Transaction = {
        id: 'txn-123',
        walletId: 'wallet-123',
        relatedWalletId: null,
        type: TransactionType.DEPOSIT,
        amount: '100.0000',
        currency: 'USD',
        balanceBefore: '0.0000',
        balanceAfter: '100.0000',
        status: TransactionStatus.COMPLETED,
        idempotencyKey: null,
        metadata: null,
        createdAt: new Date(),
      };

      mockRepository.save.mockResolvedValue(mockTransaction);

      const result = await transactionRepository.save(mockTransaction);

      expect(mockRepository.save).toHaveBeenCalledWith(mockTransaction);
      expect(result).toEqual(mockTransaction);
    });
  });
});

