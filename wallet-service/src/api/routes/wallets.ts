/**
 * Wallet routes
 * REST API endpoints for wallet operations
 */

import { Router, Request, Response, NextFunction } from 'express';
import { WalletService } from '../../services/WalletService';
import { TransactionService } from '../../services/TransactionService';
import { validateUUID, validateRequiredFields, validatePagination } from '../../utils/validators';
import { TransactionRepository, TransactionFilters } from '../../db/repositories/TransactionRepository';
import { TransactionType } from '../../models/Transaction';
import * as logger from '../../utils/logger';

const router = Router();
const walletService = new WalletService();
const transactionService = new TransactionService();
const transactionRepository = new TransactionRepository();

/**
 * POST /api/v1/wallets
 * Create a new wallet
 */
router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { currency } = req.body;

    // Validate required fields
    validateRequiredFields(req.body, ['currency']);

    logger.info('Creating wallet', {
      correlationId: req.correlationId,
      userId: req.userId,
      currency,
    });

    // Create wallet
    const wallet = await walletService.createWallet(req.userId, currency, req.correlationId);

    logger.info('Wallet created successfully', {
      correlationId: req.correlationId,
      userId: req.userId,
      walletId: wallet.id,
    });

    res.status(201).json({
      id: wallet.id,
      userId: wallet.userId,
      balance: parseFloat(wallet.balance).toFixed(2),
      currency: wallet.currency,
      status: wallet.status,
      createdAt: wallet.createdAt.toISOString(),
      updatedAt: wallet.updatedAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/wallets/:id
 * Get wallet details
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const walletId = req.params.id;

    // Validate UUID
    validateUUID(walletId, 'walletId');

    logger.debug('Fetching wallet', {
      correlationId: req.correlationId,
      userId: req.userId,
      walletId,
    });

    // Get wallet
    const wallet = await walletService.getWallet(walletId, req.userId);

    res.status(200).json({
      id: wallet.id,
      userId: wallet.userId,
      balance: parseFloat(wallet.balance).toFixed(2),
      currency: wallet.currency,
      status: wallet.status,
      createdAt: wallet.createdAt.toISOString(),
      updatedAt: wallet.updatedAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/wallets/:id/balance
 * Get wallet balance
 */
router.get(
  '/:id/balance',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const walletId = req.params.id;

      // Validate UUID
      validateUUID(walletId, 'walletId');

      logger.debug('Fetching wallet balance', {
        correlationId: req.correlationId,
        userId: req.userId,
        walletId,
      });

      // Get balance
      const balanceInfo = await walletService.getBalance(walletId, req.userId);

      res.status(200).json(balanceInfo);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/v1/wallets/:id/deposit
 * Deposit funds into wallet
 */
router.post(
  '/:id/deposit',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const walletId = req.params.id;
      const { amount, metadata } = req.body;
      const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

      // Validate inputs
      validateUUID(walletId, 'walletId');
      validateRequiredFields(req.body, ['amount']);

      logger.info('Processing deposit', {
        correlationId: req.correlationId,
        userId: req.userId,
        walletId,
        amount,
        idempotencyKey,
      });

      // Process deposit
      const transaction = await transactionService.deposit(
        walletId,
        amount,
        req.userId,
        idempotencyKey || null,
        req.correlationId,
        metadata,
      );

      logger.info('Deposit completed', {
        correlationId: req.correlationId,
        transactionId: transaction.id,
        walletId,
      });

      res.status(200).json({
        transactionId: transaction.id,
        walletId: transaction.walletId,
        type: transaction.type,
        amount: parseFloat(transaction.amount).toFixed(2),
        currency: transaction.currency,
        balanceBefore: parseFloat(transaction.balanceBefore).toFixed(2),
        balanceAfter: parseFloat(transaction.balanceAfter).toFixed(2),
        status: transaction.status,
        createdAt: transaction.createdAt.toISOString(),
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/v1/wallets/:id/withdraw
 * Withdraw funds from wallet
 */
router.post(
  '/:id/withdraw',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const walletId = req.params.id;
      const { amount, metadata } = req.body;
      const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

      // Validate inputs
      validateUUID(walletId, 'walletId');
      validateRequiredFields(req.body, ['amount']);

      logger.info('Processing withdrawal', {
        correlationId: req.correlationId,
        userId: req.userId,
        walletId,
        amount,
        idempotencyKey,
      });

      // Process withdrawal
      const transaction = await transactionService.withdraw(
        walletId,
        amount,
        req.userId,
        idempotencyKey || null,
        req.correlationId,
        metadata,
      );

      logger.info('Withdrawal completed', {
        correlationId: req.correlationId,
        transactionId: transaction.id,
        walletId,
      });

      res.status(200).json({
        transactionId: transaction.id,
        walletId: transaction.walletId,
        type: transaction.type,
        amount: parseFloat(transaction.amount).toFixed(2),
        currency: transaction.currency,
        balanceBefore: parseFloat(transaction.balanceBefore).toFixed(2),
        balanceAfter: parseFloat(transaction.balanceAfter).toFixed(2),
        status: transaction.status,
        createdAt: transaction.createdAt.toISOString(),
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/v1/wallets/:id/transfer
 * Transfer funds to another wallet
 */
router.post(
  '/:id/transfer',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sourceWalletId = req.params.id;
      const { destinationWalletId, amount, metadata } = req.body;
      const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

      // Validate inputs
      validateUUID(sourceWalletId, 'walletId');
      validateRequiredFields(req.body, ['destinationWalletId', 'amount']);
      validateUUID(destinationWalletId, 'destinationWalletId');

      logger.info('Processing transfer', {
        correlationId: req.correlationId,
        userId: req.userId,
        sourceWalletId,
        destinationWalletId,
        amount,
        idempotencyKey,
      });

      // Process transfer
      const result = await transactionService.transfer(
        sourceWalletId,
        destinationWalletId,
        amount,
        req.userId,
        idempotencyKey || null,
        req.correlationId,
        metadata,
      );

      logger.info('Transfer completed', {
        correlationId: req.correlationId,
        transferId: result.transferId,
        sourceWalletId,
        destinationWalletId,
      });

      res.status(200).json({
        sourceTransaction: {
          transactionId: result.sourceTransaction.id,
          walletId: result.sourceTransaction.walletId,
          type: result.sourceTransaction.type,
          amount: parseFloat(result.sourceTransaction.amount).toFixed(2),
          currency: result.sourceTransaction.currency,
          balanceBefore: parseFloat(result.sourceTransaction.balanceBefore).toFixed(2),
          balanceAfter: parseFloat(result.sourceTransaction.balanceAfter).toFixed(2),
          status: result.sourceTransaction.status,
          createdAt: result.sourceTransaction.createdAt.toISOString(),
        },
        destinationTransaction: {
          transactionId: result.destinationTransaction.id,
          walletId: result.destinationTransaction.walletId,
          type: result.destinationTransaction.type,
          amount: parseFloat(result.destinationTransaction.amount).toFixed(2),
          currency: result.destinationTransaction.currency,
          balanceBefore: parseFloat(result.destinationTransaction.balanceBefore).toFixed(2),
          balanceAfter: parseFloat(result.destinationTransaction.balanceAfter).toFixed(2),
          status: result.destinationTransaction.status,
          createdAt: result.destinationTransaction.createdAt.toISOString(),
        },
        transferId: result.transferId,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/v1/wallets/:id/transactions
 * Get transaction history for wallet
 */
router.get(
  '/:id/transactions',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const walletId = req.params.id;
      const { page = '1', pageSize = '20', type, startDate, endDate } = req.query;

      // Validate inputs
      validateUUID(walletId, 'walletId');

      // Verify wallet ownership first
      await walletService.getWallet(walletId, req.userId);

      // Validate pagination
      const pagination = validatePagination(page as string, pageSize as string);

      // Build filters
      const filters: TransactionFilters = {};
      if (type) {
        filters.type = type as TransactionType;
      }
      if (startDate) {
        filters.startDate = new Date(startDate as string);
      }
      if (endDate) {
        filters.endDate = new Date(endDate as string);
      }

      logger.debug('Fetching transaction history', {
        correlationId: req.correlationId,
        userId: req.userId,
        walletId,
        page: pagination.page,
        pageSize: pagination.pageSize,
        filters,
      });

      // Get transactions
      const [transactions, totalCount] = await Promise.all([
        transactionRepository.findByWalletId(walletId, pagination, filters),
        transactionRepository.countByWalletId(walletId, filters),
      ]);

      const totalPages = Math.ceil(totalCount / pagination.pageSize);

      res.status(200).json({
        transactions: transactions.map((txn) => ({
          transactionId: txn.id,
          walletId: txn.walletId,
          relatedWalletId: txn.relatedWalletId,
          type: txn.type,
          amount: parseFloat(txn.amount).toFixed(2),
          currency: txn.currency,
          balanceBefore: parseFloat(txn.balanceBefore).toFixed(2),
          balanceAfter: parseFloat(txn.balanceAfter).toFixed(2),
          status: txn.status,
          metadata: txn.metadata,
          createdAt: txn.createdAt.toISOString(),
        })),
        pagination: {
          page: pagination.page,
          pageSize: pagination.pageSize,
          totalItems: totalCount,
          totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;

