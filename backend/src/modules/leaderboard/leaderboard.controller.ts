import { Request, Response } from 'express';
import { BettingUser } from '../../models/User';
import * as respond from '../../utils/responseHelper';
import { createLogger } from '../../utils/logger';

const logger = createLogger('leaderboard');

/**
 * GET /leaderboard/stats
 */
export async function getLeaderboardStats(_req: Request, res: Response) {
  try {
    const totalPlayers = await BettingUser.countDocuments({ role: 'user' });
    respond.success(res, { totalPlayers });
  } catch (err) {
    logger.error('Leaderboard stats error:', err);
    respond.serverError(res, 'Failed to fetch leaderboard stats');
  }
}

/**
 * GET /leaderboard/income
 * Leaderboard ranked by income (currentPoints - startingPoints)
 * Uses MongoDB aggregation instead of in-memory sort
 */
export async function getIncomeLeaderboard(req: Request, res: Response) {
  try {
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);

    const ranked = await BettingUser.aggregate([
      { $match: { role: 'user', isActive: true } },
      {
        $project: {
          username: 1,
          tier: 1,
          currentPoints: 1,
          startingPoints: 1,
          totalBet: 1,
          totalPayout: 1,
          income: { $subtract: ['$currentPoints', '$startingPoints'] },
        },
      },
      { $sort: { income: -1 } },
      { $limit: limit },
    ]);

    respond.success(res, ranked.map(u => ({
      id: u._id,
      username: u.username,
      tier: u.tier,
      currentPoints: u.currentPoints,
      startingPoints: u.startingPoints,
      totalBet: u.totalBet,
      totalPayout: u.totalPayout,
      income: u.income,
    })));
  } catch (err) {
    logger.error('Income leaderboard error:', err);
    respond.serverError(res, 'Failed to fetch leaderboard');
  }
}

/**
 * GET /leaderboard/roi
 * Leaderboard ranked by ROI — uses MongoDB aggregation
 */
export async function getRoiLeaderboard(req: Request, res: Response) {
  try {
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);

    const ranked = await BettingUser.aggregate([
      { $match: { role: 'user', isActive: true, totalBet: { $gt: 0 } } },
      {
        $project: {
          username: 1,
          tier: 1,
          totalBet: 1,
          totalPayout: 1,
          roi: {
            $round: [
              { $divide: [{ $subtract: ['$totalPayout', '$totalBet'] }, '$totalBet'] },
              4,
            ],
          },
        },
      },
      { $sort: { roi: -1 } },
      { $limit: limit },
    ]);

    respond.success(res, ranked.map(u => ({
      id: u._id,
      username: u.username,
      tier: u.tier,
      roi: u.roi,
      totalBet: u.totalBet,
      totalPayout: u.totalPayout,
    })));
  } catch (err) {
    logger.error('ROI leaderboard error:', err);
    respond.serverError(res, 'Failed to fetch leaderboard');
  }
}

/**
 * GET /leaderboard/points
 * Leaderboard ranked by raw current points (already optimized with DB sort+limit)
 */
export async function getPointsLeaderboard(req: Request, res: Response) {
  try {
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);

    const users = await BettingUser.find({ role: 'user', isActive: true })
      .select('username tier currentPoints')
      .sort({ currentPoints: -1 })
      .limit(limit)
      .lean();

    const ranked = users.map((u, i) => ({
      rank: i + 1,
      id: u._id,
      username: u.username,
      tier: u.tier,
      currentPoints: u.currentPoints,
    }));

    respond.success(res, ranked);
  } catch (err) {
    logger.error('Points leaderboard error:', err);
    respond.serverError(res, 'Failed to fetch leaderboard');
  }
}
