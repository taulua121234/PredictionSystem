import { Trainer } from '../models/Trainer';
import { createLogger } from '../utils/logger';

const logger = createLogger('seed-trainers');

const SEED_TRAINERS = [
  { name: 'Trainer A — Sakura Stable' },
  { name: 'Trainer B — Nishino Flower' },
  { name: 'Trainer C — Star Academy' },
  { name: 'Trainer D — Crystal Racing' },
  { name: 'Trainer E — Thunder Farm' },
];

export async function seedTrainers() {
  let created = 0;
  for (const data of SEED_TRAINERS) {
    const existing = await Trainer.findOne({ name: data.name });
    if (!existing) {
      await Trainer.create({ ...data, isActive: true });
      created++;
    }
  }
  logger.info(`Trainers seeded: ${created} new (${SEED_TRAINERS.length - created} already existed)`);
}
