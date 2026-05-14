import { Uma } from '../models/Uma';
import { createLogger } from '../utils/logger';

const logger = createLogger('seed-umas');

const SEED_UMAS = [
  { name: 'Special Week', stats: { speed: 85, stamina: 80, power: 75, guts: 70, wisdom: 78 } },
  { name: 'Silence Suzuka', stats: { speed: 95, stamina: 65, power: 70, guts: 80, wisdom: 72 } },
  { name: 'Tokai Teio', stats: { speed: 88, stamina: 75, power: 80, guts: 85, wisdom: 76 } },
  { name: 'Vodka', stats: { speed: 90, stamina: 70, power: 82, guts: 88, wisdom: 68 } },
  { name: 'Oguri Cap', stats: { speed: 82, stamina: 90, power: 85, guts: 92, wisdom: 65 } },
  { name: 'Gold Ship', stats: { speed: 78, stamina: 88, power: 90, guts: 95, wisdom: 60 } },
  { name: 'Rice Shower', stats: { speed: 75, stamina: 92, power: 78, guts: 85, wisdom: 80 } },
  { name: 'Mejiro McQueen', stats: { speed: 80, stamina: 85, power: 76, guts: 72, wisdom: 88 } },
  { name: 'Symboli Rudolf', stats: { speed: 86, stamina: 82, power: 84, guts: 78, wisdom: 90 } },
  { name: 'Grass Wonder', stats: { speed: 87, stamina: 78, power: 80, guts: 75, wisdom: 82 } },
  { name: 'El Condor Pasa', stats: { speed: 89, stamina: 76, power: 83, guts: 80, wisdom: 74 } },
  { name: 'T.M. Opera O', stats: { speed: 84, stamina: 84, power: 82, guts: 82, wisdom: 86 } },
];

export async function seedUmas() {
  let created = 0;
  for (const data of SEED_UMAS) {
    const existing = await Uma.findOne({ name: data.name });
    if (!existing) {
      await Uma.create({ ...data, isActive: true });
      created++;
    }
  }
  logger.info(`Umas seeded: ${created} new (${SEED_UMAS.length - created} already existed)`);
}
