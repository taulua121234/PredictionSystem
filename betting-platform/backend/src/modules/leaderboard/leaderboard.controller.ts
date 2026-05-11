import { Request, Response } from 'express';
import { BettingUser } from '../../models/User';
import { calculateIncome, calculateROI } from '../../utils/pointsCalculator';
import * as respond from '../../utils/responseHelper';
import { createLogger } from '../../utils/logger';

const logger = createLogger('leaderboard');

/**
 * GET /leaderboard/income
 * Leaderboard ranked by income (currentPoints - startingPoints)
 */
export async function getIncomeLeaderboard(req: Request, res: Response) {
  try {
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);

    const users = await BettingUser.find({ role: 'user', isActive: true })
      .select('username tier currentPoints startingPoints totalBet totalPayout')
      .lean();

    const ranked = users
      .map(u => ({
        id: u._id,
        username: u.username,
        tier: u.tier,
        currentPoints: u.currentPoints,
        income: calculateIncome(u.currentPoints, u.startingPoints),
      }))
      .sort((a, b) => b.income - a.income)
      .slice(0, limit);

    respond.success(res, ranked);
  } catch (err) {
    logger.error('Income leaderboard error:', err);
    respond.serverError(res, 'Failed to fetch leaderboard');
  }
}

/**
 * GET /leaderboard/roi
 * Leaderboard ranked by ROI
 */
export async function getRoiLeaderboard(req: Request, res: Response) {
  try {
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);

    const users = await BettingUser.find({ role: 'user', isActive: true, totalBet: { $gt: 0 } })
      .select('username tier totalBet totalPayout')
      .lean();

    const ranked = users
      .map(u => ({
        id: u._id,
        username: u.username,
        tier: u.tier,
        roi: calculateROI(u.totalPayout, u.totalBet),
        totalBet: u.totalBet,
        totalPayout: u.totalPayout,
      }))
      .sort((a, b) => b.roi - a.roi)
      .slice(0, limit);

    respond.success(res, ranked);
  } catch (err) {
    logger.error('ROI leaderboard error:', err);
    respond.serverError(res, 'Failed to fetch leaderboard');
  }
}

/**
 * GET /leaderboard/points
 * Leaderboard ranked by raw current points
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
