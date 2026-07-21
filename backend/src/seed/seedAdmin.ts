import bcrypt from 'bcryptjs';
import { BettingUser } from '../models/User';
import { createLogger } from '../utils/logger';

const logger = createLogger('seed-admin');

export async function seedAdmin() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';

  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await BettingUser.findOne({ username, role: 'admin' });

  if (existing) {
    existing.passwordHash = passwordHash;
    await existing.save();
    logger.info(`Admin account verified/updated: ${username}`);
    return;
  }

  await BettingUser.create({
    username,
    passwordHash,
    role: 'admin',
    tier: 'G3',
    startingPoints: 0,
    currentPoints: 0,
    totalBet: 0,
    totalPayout: 0,
    isActive: true,
  });

  logger.info(`Admin account created: ${username}`);
}
