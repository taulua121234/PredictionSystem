import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Bet } from '../../models/Bet';
import { Race } from '../../models/Race';
import { BettingUser } from '../../models/User';
import { Transaction } from '../../models/Transaction';
import * as respond from '../../utils/responseHelper';
import { createLogger } from '../../utils/logger';
import {
  applyDynamicOddsToEntries,
  calculateRaceBetStats,
  calculateTrainerOdd,
  calculateTrifectaOdd,
  getCurrentOdd,
  normalizeEntryOdds,
} from '../../utils/dynamicOdds';

const logger = createLogger('bets');

/**
 * POST /bets/place
 * Place a bet (atomic transaction)
 */
export async function placeBet(req: Request, res: Response) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { raceId, category, prediction, amount } = req.body;
    const userId = req.user!.id;

    // Validate input
    if (!raceId || !category || !prediction || amount === undefined || amount === null || amount === '') {
      await session.abortTransaction();
      return respond.badRequest(res, 'raceId, category, prediction, and amount are required');
    }

    const betAmount = Number(amount);
    if (!Number.isFinite(betAmount) || betAmount < 0) {
      await session.abortTransaction();
      return respond.badRequest(res, 'Bet amount must be 0 points or more');
    }

    // 1. Check race state
    const race = await Race.findById(raceId).session(session);
    if (!race) {
      await session.abortTransaction();
      return respond.notFound(res, 'Race not found');
    }
    if (race.state !== 'BETTING_OPEN') {
      await session.abortTransaction();
      return respond.badRequest(res, `Betting is not open. Current state: ${race.state}`);
    }
    race.entries.forEach(entry => normalizeEntryOdds(entry));

    // 2. Find the odd for this prediction
    let oddAtBetTime = 1;
    if (category === 'UMA_WIN' && prediction.umaId) {
      const entry = race.entries.find(e => e.umaId.toString() === prediction.umaId);
      if (!entry) {
        await session.abortTransaction();
        return respond.badRequest(res, 'Selected Uma is not in this race');
      }
      oddAtBetTime = getCurrentOdd(entry);
    } else if (category === 'TRAINER_WIN' && prediction.trainerId) {
      const trainerEntries = race.entries.filter(e => e.trainerId?.toString() === prediction.trainerId);
      if (trainerEntries.length === 0) {
        await session.abortTransaction();
        return respond.badRequest(res, 'Selected Trainer is not in this race');
      }
      oddAtBetTime = calculateTrainerOdd(race.entries, prediction.trainerId);
    } else if (category === 'TRIFECTA' && prediction.first && prediction.second && prediction.third) {
      const firstEntry = race.entries.find(e => e.umaId.toString() === prediction.first);
      const secondEntry = race.entries.find(e => e.umaId.toString() === prediction.second);
      const thirdEntry = race.entries.find(e => e.umaId.toString() === prediction.third);

      if (!firstEntry || !secondEntry || !thirdEntry) {
        await session.abortTransaction();
        return respond.badRequest(res, 'One or more selected Umas are not in this race');
      }
      oddAtBetTime = calculateTrifectaOdd(race.entries, prediction.first, prediction.second, prediction.third);
    } else {
      await session.abortTransaction();
      return respond.badRequest(res, 'Invalid category or prediction');
    }

    // 3. Check user balance
    const user = await BettingUser.findById(userId).session(session);
    if (!user) {
      await session.abortTransaction();
      return respond.notFound(res, 'User not found');
    }
    const maxBetAmount = Math.floor(user.currentPoints * 0.7);
    if (betAmount > maxBetAmount) {
      await session.abortTransaction();
      return respond.badRequest(res, `Maximum bet is ${maxBetAmount} points (70% of current points)`);
    }
    if (user.currentPoints < betAmount) {
      await session.abortTransaction();
      return respond.badRequest(res, `Insufficient points. Current: ${user.currentPoints}, Required: ${betAmount}`);
    }

    // 4. Deduct points
    const balanceBefore = user.currentPoints;
    user.currentPoints -= betAmount;
    user.totalBet += betAmount;
    await user.save({ session });

    // 5. Create bet
    const [bet] = await Bet.create(
      [{
        userId,
        raceId,
        category,
        prediction,
        amount: betAmount,
        oddAtBetTime,
        payout: 0,
        status: 'pending',
      }],
      { session }
    );

    // 6. Create transaction log
    await Transaction.create(
      [{
        userId,
        type: 'BET',
        amount: -betAmount,
        balanceBefore,
        balanceAfter: user.currentPoints,
        raceId,
        betId: bet._id,
        description: `Bet ${betAmount} on ${category}`,
      }],
      { session }
    );

    let updatedEntries: ReturnType<typeof applyDynamicOddsToEntries> | null = null;
    let updatedStats: ReturnType<typeof calculateRaceBetStats> | null = null;

    if (betAmount > 0 && (category === 'UMA_WIN' || category === 'TRAINER_WIN')) {
      const marketBets = await Bet.find({
        raceId: race._id,
        category: { $in: ['UMA_WIN', 'TRAINER_WIN'] },
        status: { $ne: 'refunded' },
      }).session(session).lean();

      updatedEntries = applyDynamicOddsToEntries(race.entries, marketBets);
      updatedStats = calculateRaceBetStats(race.entries, marketBets);
      await race.save({ session });
    }

    // 7. Commit
    await session.commitTransaction();

    logger.info(`Bet placed: ${user.username} -> ${betAmount} pts on ${category} (race: ${race.raceName})`);

    if (updatedEntries && updatedStats) {
      const raceIdString = race._id.toString();
      const io = req.app.get('io');
      if (io) {
        io.to(`race:${raceIdString}`).emit('bet:update', {
          raceId: raceIdString,
          entries: updatedEntries,
          stats: updatedStats,
        });
      }
    }

    respond.created(res, {
      bet: {
        id: bet._id,
        category: bet.category,
        prediction: bet.prediction,
        amount: bet.amount,
        oddAtBetTime: bet.oddAtBetTime,
        status: bet.status,
      },
      currentPoints: user.currentPoints,
      race: updatedEntries ? { entries: updatedEntries } : undefined,
      stats: updatedStats || undefined,
    });
  } catch (err) {
    await session.abortTransaction();
    logger.error('Place bet error:', err);
    respond.serverError(res, 'Failed to place bet');
  } finally {
    session.endSession();
  }
}

/**
 * GET /bets/history
 * Get current user's bet history
 */
export async function getBetHistory(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));

    const [bets, total] = await Promise.all([
      Bet.find({ userId })
        .populate('raceId', 'raceName state')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Bet.countDocuments({ userId }),
    ]);

    respond.paginated(res, bets, total, page, limit);
  } catch (err) {
    logger.error('Bet history error:', err);
    respond.serverError(res, 'Failed to fetch bet history');
  }
}

/**
 * GET /bets/race/:raceId/stats
 * Get betting stats for a race (community predictions)
 */
export async function getRaceBetStats(req: Request, res: Response) {
  try {
    const { raceId } = req.params;

    const race = await Race.findById(raceId).lean();
    if (!race) {
      return respond.notFound(res, 'Race not found');
    }

    const marketBets = await Bet.find({
      raceId: new mongoose.Types.ObjectId(raceId as string),
      category: { $in: ['UMA_WIN', 'TRAINER_WIN'] },
      status: { $ne: 'refunded' },
    }).lean();

    respond.success(res, calculateRaceBetStats(race.entries, marketBets));
  } catch (err) {
    logger.error('Race bet stats error:', err);
    respond.serverError(res, 'Failed to fetch bet stats');
  }
}
