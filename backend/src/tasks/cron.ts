import { Race } from '../models/Race';
import { getIO } from '../modules/websocket/socketHandler';
import { createLogger } from '../utils/logger';

const logger = createLogger('cron');

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
}
