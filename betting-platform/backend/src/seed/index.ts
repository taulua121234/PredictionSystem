import mongoose from 'mongoose';
import { connectBettingDb } from '../config/database';
import { seedAdmin } from './seedAdmin';
import { seedUmas } from './seedUmas';
import { seedTrainers } from './seedTrainers';
import { createLogger } from '../utils/logger';

const logger = createLogger('seed');

async function main() {
  try {
    await connectBettingDb();
    logger.info('Running seed scripts...');

    await seedAdmin();
    await seedUmas();
    await seedTrainers();

    logger.info('All seeds completed!');
  } catch (err) {
    logger.error('Seed failed:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

main();
