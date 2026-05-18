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
 * Settle a race — calculate winners and distribute payouts
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

    let totalPaidOut = 0;
    let winnersCount = 0;
    const pointUpdates = new Map<string, number>();

    for (const bet of bets) {
      let isWinner = false;

      // Determine if bet wins
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
        bet.payout = payout;
        bet.status = 'won';
        await bet.save({ session });

        // Update user balance
        const user = await BettingUser.findById(bet.userId).session(session);
        if (user) {
          const balanceBefore = user.currentPoints;
          user.currentPoints += payout;
          user.totalPayout += payout;
          await user.save({ session });
          pointUpdates.set(user._id.toString(), user.currentPoints);

          // Create payout transaction
          await Transaction.create(
            [{
              userId: user._id,
              type: 'PAYOUT',
              amount: payout,
              balanceBefore,
              balanceAfter: user.currentPoints,
              raceId,
              betId: bet._id,
              description: `Won ${bet.category}: +${payout} pts`,
            }],
            { session }
          );
        }

        totalPaidOut += payout;
        winnersCount++;
      } else {
        bet.status = 'lost';
        await bet.save({ session });
      }
    }

    // Update race state to SETTLED
    race.state = 'SETTLED';
    await race.save({ session });

    await session.commitTransaction();

    const io = req.app.get('io');
    if (io) {
      pointUpdates.forEach((currentPoints, userId) => {
        sendUserPointUpdate(io, userId, currentPoints);
      });
    }

    logger.info(`Race settled: ${race.raceName} — ${winnersCount} winners, ${totalPaidOut} points paid`);

    respond.success(res, {
      raceName: race.raceName,
      totalBets: bets.length,
      winnersCount,
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
