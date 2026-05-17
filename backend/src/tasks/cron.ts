import { Race } from '../models/Race';
import { Bet } from '../models/Bet';
import { getIO } from '../modules/websocket/socketHandler';
import { applyDynamicOddsToEntries, calculateRaceBetStats, getCurrentOdd } from '../utils/dynamicOdds';
import { createLogger } from '../utils/logger';

const logger = createLogger('cron');
const DYNAMIC_ODDS_INTERVAL_MS = 10_000;

function oddsChanged(before: number[], after: { currentOdd: number }[]) {
  return before.some((odd, index) => odd !== after[index]?.currentOdd);
}

let dynamicOddsTickRunning = false;

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

export function startCronJobs() {
  logger.info('Starting cron jobs for race status updates...');

  setInterval(async () => {
    try {
      const now = new Date();

      // 1. Check for UPCOMING -> BETTING_OPEN
      const racesToOpen = await Race.find({
        state: 'UPCOMING',
        startTime: { $lte: now }
      });

      for (const race of racesToOpen) {
        race.state = 'BETTING_OPEN';
        await race.save();
        logger.info(`Auto-opened betting for race: ${race.raceName}`);
        
        const io = getIO();
        if (io) {
          io.emit('race:update', { raceId: race._id, state: race.state });
        }
      }

      // 2. Check for BETTING_OPEN -> LOCKED
      const racesToLock = await Race.find({
        state: 'BETTING_OPEN',
        closeBetTime: { $lte: now }
      });

      for (const race of racesToLock) {
        race.state = 'LOCKED';
        await race.save();
        logger.info(`Auto-locked betting for race: ${race.raceName}`);
        
        const io = getIO();
        if (io) {
          io.emit('race:update', { raceId: race._id, state: race.state });
        }
      }
    } catch (err) {
      logger.error('Error in race status cron job:', err);
    }
  }, 5000); // Check every 5 seconds

  logger.info('Starting dynamic odds interval job...');
  setInterval(updateDynamicOddsForOpenRaces, DYNAMIC_ODDS_INTERVAL_MS);
}
