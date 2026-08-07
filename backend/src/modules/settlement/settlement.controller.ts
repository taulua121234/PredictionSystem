import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Race } from '../../models/Race';
import { Bet } from '../../models/Bet';
import { BettingUser } from '../../models/User';
import { Transaction } from '../../models/Transaction';
import { calculatePayout } from '../../utils/pointsCalculator';
import * as respond from '../../utils/responseHelper';
import { createLogger } from '../../utils/logger';
import { sendUserPointUpdate } from '../websocket/socketHandler';

const logger = createLogger('settlement');

/**
 * POST /admin/races/:id/settle
 * Settle a race — calculate winners and distribute payouts (optimized batch)
 */
export async function settleRace(req: Request, res: Response) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const raceId = req.params.id;
    const race = await Race.findById(raceId).session(session);

    if (!race) {
      await session.abortTransaction();
      return respond.notFound(res, 'Race not found');
    }

    if (race.state !== 'FINISHED') {
      await session.abortTransaction();
      return respond.badRequest(res, `Race must be FINISHED to settle. Current: ${race.state}`);
    }

    if (!race.result?.first) {
      await session.abortTransaction();
      return respond.badRequest(res, 'Race result must be set before settlement');
    }

    // Load all pending bets for this race
    const bets = await Bet.find({ raceId, status: 'pending' }).session(session);

    // Phase 1: Classify bets (pure computation, no DB calls)
    const winningBets: { betId: mongoose.Types.ObjectId; userId: mongoose.Types.ObjectId; payout: number; category: string }[] = [];
    const losingBetIds: mongoose.Types.ObjectId[] = [];

    for (const bet of bets) {
      let isWinner = false;

      if (bet.category === 'UMA_WIN' && bet.prediction.umaId) {
        isWinner = bet.prediction.umaId.toString() === race.result.first!.toString();
      } else if (bet.category === 'TRAINER_WIN' && bet.prediction.trainerId) {
        isWinner = bet.prediction.trainerId.toString() === (race.result.winnerTrainerId?.toString() || '');
      } else if (bet.category === 'TRIFECTA') {
        isWinner =
          bet.prediction.first?.toString() === race.result.first!.toString() &&
          bet.prediction.second?.toString() === (race.result.second?.toString() || '') &&
          bet.prediction.third?.toString() === (race.result.third?.toString() || '');
      }

      if (isWinner) {
        const payout = calculatePayout(bet.amount, bet.oddAtBetTime);
        winningBets.push({ betId: bet._id, userId: bet.userId, payout, category: bet.category });
      } else {
        losingBetIds.push(bet._id);
      }
    }

    // Phase 2: Batch update losing bets (1 DB call instead of N)
    if (losingBetIds.length > 0) {
      await Bet.updateMany(
        { _id: { $in: losingBetIds } },
        { $set: { status: 'lost' } },
        { session }
      );
    }

    // Phase 3: Process winners — aggregate payouts per user
    const userPayouts = new Map<string, { totalPayout: number; bets: typeof winningBets }>();
    for (const wb of winningBets) {
      const uid = wb.userId.toString();
      const existing = userPayouts.get(uid);
      if (existing) {
        existing.totalPayout += wb.payout;
        existing.bets.push(wb);
      } else {
        userPayouts.set(uid, { totalPayout: wb.payout, bets: [wb] });
      }
    }

    // Phase 4: Update winning bets in batch
    const betBulkOps = winningBets.map(wb => ({
      updateOne: {
        filter: { _id: wb.betId },
        update: { $set: { status: 'won' as const, payout: wb.payout } },
      },
    }));
    if (betBulkOps.length > 0) {
      await Bet.bulkWrite(betBulkOps, { session });
    }

    // Phase 5: Update user balances + create transactions
    let totalPaidOut = 0;
    const pointUpdates = new Map<string, number>();
    const transactionDocs: any[] = [];

    for (const [userId, data] of userPayouts) {
      const user = await BettingUser.findById(userId).session(session);
      if (!user) continue;

      const balanceBefore = user.currentPoints;
      user.currentPoints += data.totalPayout;
      user.totalPayout += data.totalPayout;
      await user.save({ session });

      pointUpdates.set(userId, user.currentPoints);
      totalPaidOut += data.totalPayout;

      // Batch transaction docs (1 per user instead of 1 per bet)
      transactionDocs.push({
        userId: user._id,
        type: 'PAYOUT',
        amount: data.totalPayout,
        balanceBefore,
        balanceAfter: user.currentPoints,
        raceId,
        description: `Won ${data.bets.length} bet(s): +${data.totalPayout} pts`,
      });
    }

    if (transactionDocs.length > 0) {
      await Transaction.insertMany(transactionDocs, { session });
    }

    // Phase 6: Update race state
    race.state = 'SETTLED';
    await race.save({ session });

    await session.commitTransaction();

    // Phase 7: Broadcast (outside transaction)
    const io = req.app.get('io');
    if (io) {
      pointUpdates.forEach((currentPoints, userId) => {
        sendUserPointUpdate(io, userId, currentPoints);
      });
    }

    logger.info(`Race settled: ${race.raceName} — ${winningBets.length} winners, ${totalPaidOut} points paid`);

    respond.success(res, {
      raceName: race.raceName,
      totalBets: bets.length,
      winnersCount: winningBets.length,
      totalPaidOut,
    });
  } catch (err) {
    await session.abortTransaction();
    logger.error('Settlement error:', err);
    respond.serverError(res, 'Settlement failed');
  } finally {
    session.endSession();
  }
}
