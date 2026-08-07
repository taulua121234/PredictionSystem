import { Race } from '../models/Race';
import { Bet } from '../models/Bet';
import { getIO } from '../modules/websocket/socketHandler';
import { applyDynamicOddsToEntries, calculateRaceBetStats, getCurrentOdd } from '../utils/dynamicOdds';
import { createLogger } from '../utils/logger';

const logger = createLogger('cron');

// Intervals — tăng lên để giảm áp lực DB trên cấu hình thấp
const RACE_STATE_INTERVAL_MS = 10_000;    // 10s thay vì 5s
const DYNAMIC_ODDS_INTERVAL_MS = 15_000;  // 15s thay vì 10s

function oddsChanged(before: number[], after: { currentOdd: number }[]) {
  return before.some((odd, index) => odd !== after[index]?.currentOdd);
}

// Guard flags
let raceStateTickRunning = false;
let dynamicOddsTickRunning = false;

async function updateRaceStates() {
  if (raceStateTickRunning) return;
  raceStateTickRunning = true;

  try {
    const now = new Date();
    const io = getIO();

    // 1. Batch: UPCOMING → BETTING_OPEN (dùng updateMany thay vì loop save)
    const openResult = await Race.updateMany(
      { state: 'UPCOMING', startTime: { $lte: now } },
      { $set: { state: 'BETTING_OPEN' } }
    );

    if (openResult.modifiedCount > 0) {
      logger.info(`Auto-opened betting for ${openResult.modifiedCount} race(s)`);
      // Broadcast — lấy danh sách race vừa update để emit
      const openedRaces = await Race.find({ state: 'BETTING_OPEN', startTime: { $lte: now } })
        .select('_id state').lean();
      if (io) {
        for (const race of openedRaces) {
          io.emit('race:update', { raceId: race._id, state: race.state });
        }
      }
    }

    // 2. Batch: BETTING_OPEN → LOCKED
    const lockResult = await Race.updateMany(
      { state: 'BETTING_OPEN', closeBetTime: { $lte: now } },
      { $set: { state: 'LOCKED' } }
    );

    if (lockResult.modifiedCount > 0) {
      logger.info(`Auto-locked betting for ${lockResult.modifiedCount} race(s)`);
      const lockedRaces = await Race.find({ state: 'LOCKED', closeBetTime: { $lte: now } })
        .select('_id state').lean();
      if (io) {
        for (const race of lockedRaces) {
          io.emit('race:update', { raceId: race._id, state: race.state });
        }
      }
    }
  } catch (err) {
    logger.error('Error in race status cron job:', err);
  } finally {
    raceStateTickRunning = false;
  }
}

async function updateDynamicOddsForOpenRaces() {
  if (dynamicOddsTickRunning) return;
  dynamicOddsTickRunning = true;

  try {
    const races = await Race.find({ state: 'BETTING_OPEN' });
    const io = getIO();

    for (const race of races) {
      const marketBets = await Bet.find({
        raceId: race._id,
        category: { $in: ['UMA_WIN', 'TRAINER_WIN'] },
        status: { $ne: 'refunded' },
      }).lean();

      const previousOdds = race.entries.map(entry => getCurrentOdd(entry));
      const updatedEntries = applyDynamicOddsToEntries(race.entries, marketBets);
      const updatedStats = calculateRaceBetStats(race.entries, marketBets);

      if (!oddsChanged(previousOdds, updatedEntries)) continue;

      await race.save();

      if (io) {
        const raceId = race._id.toString();
        io.to(`race:${raceId}`).emit('bet:update', {
          raceId,
          entries: updatedEntries,
          stats: updatedStats,
        });
      }
    }
  } catch (err) {
    logger.error('Error in dynamic odds interval job:', err);
  } finally {
    dynamicOddsTickRunning = false;
  }
}

let raceStateTimer: ReturnType<typeof setInterval> | null = null;
let oddsTimer: ReturnType<typeof setInterval> | null = null;

export function startCronJobs() {
  logger.info(`Starting cron jobs (race state: ${RACE_STATE_INTERVAL_MS}ms, odds: ${DYNAMIC_ODDS_INTERVAL_MS}ms)`);
  raceStateTimer = setInterval(updateRaceStates, RACE_STATE_INTERVAL_MS);
  oddsTimer = setInterval(updateDynamicOddsForOpenRaces, DYNAMIC_ODDS_INTERVAL_MS);
}

export function stopCronJobs() {
  if (raceStateTimer) { clearInterval(raceStateTimer); raceStateTimer = null; }
  if (oddsTimer) { clearInterval(oddsTimer); oddsTimer = null; }
  logger.info('Cron jobs stopped');
}
