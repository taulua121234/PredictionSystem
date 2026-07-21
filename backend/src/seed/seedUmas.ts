import { Uma } from '../models/Uma';
import { Trainer } from '../models/Trainer';
import { createLogger } from '../utils/logger';

const logger = createLogger('seed-umas');

const SEED_UMAS = [
  // Trainer 1 (4 Umas)
  { name: 'Special Week', stats: { speed: 85, stamina: 80, power: 75, guts: 70, wisdom: 78 } },
  { name: 'Silence Suzuka', stats: { speed: 95, stamina: 65, power: 70, guts: 80, wisdom: 72 } },
  { name: 'Tokai Teio', stats: { speed: 88, stamina: 75, power: 80, guts: 85, wisdom: 76 } },
  { name: 'Vodka', stats: { speed: 90, stamina: 70, power: 82, guts: 88, wisdom: 68 } },
  // Trainer 2 (4 Umas)
  { name: 'Oguri Cap', stats: { speed: 82, stamina: 90, power: 85, guts: 92, wisdom: 65 } },
  { name: 'Gold Ship', stats: { speed: 78, stamina: 88, power: 90, guts: 95, wisdom: 60 } },
  { name: 'Rice Shower', stats: { speed: 75, stamina: 92, power: 78, guts: 85, wisdom: 80 } },
  { name: 'Mejiro McQueen', stats: { speed: 80, stamina: 85, power: 76, guts: 72, wisdom: 88 } },
  // Trainer 3 (4 Umas)
  { name: 'Symboli Rudolf', stats: { speed: 86, stamina: 82, power: 84, guts: 78, wisdom: 90 } },
  { name: 'Grass Wonder', stats: { speed: 87, stamina: 78, power: 80, guts: 75, wisdom: 82 } },
  { name: 'El Condor Pasa', stats: { speed: 89, stamina: 76, power: 83, guts: 80, wisdom: 74 } },
  { name: 'T.M. Opera O', stats: { speed: 84, stamina: 84, power: 82, guts: 82, wisdom: 86 } },
  // Trainer 4 (4 Umas)
  { name: 'Twin Turbo', stats: { speed: 92, stamina: 60, power: 75, guts: 88, wisdom: 60 } },
  { name: 'King Halo', stats: { speed: 84, stamina: 70, power: 80, guts: 78, wisdom: 85 } },
  { name: 'Haru Urara', stats: { speed: 65, stamina: 70, power: 68, guts: 99, wisdom: 70 } },
  { name: 'Kitasan Black', stats: { speed: 91, stamina: 89, power: 86, guts: 84, wisdom: 82 } },
  // Trainer 5 (4 Umas)
  { name: 'Satono Diamond', stats: { speed: 88, stamina: 87, power: 85, guts: 80, wisdom: 86 } },
  { name: 'Super Creek', stats: { speed: 78, stamina: 94, power: 80, guts: 82, wisdom: 84 } },
  { name: 'Inari One', stats: { speed: 85, stamina: 86, power: 89, guts: 90, wisdom: 75 } },
  { name: 'Mayano Top Gun', stats: { speed: 86, stamina: 88, power: 82, guts: 85, wisdom: 80 } },
];

export async function seedUmas() {
  let created = 0;
  const trainers = await Trainer.find().sort({ createdAt: 1 });

  for (let i = 0; i < SEED_UMAS.length; i++) {
    const data = SEED_UMAS[i];
    const trainer = trainers[Math.floor(i / 4)];
    const trainerId = trainer ? trainer._id : undefined;

    const existing = await Uma.findOne({ name: data.name });
    if (!existing) {
      await Uma.create({ ...data, trainerId, isActive: true });
      created++;
    } else if (trainerId && (!existing.trainerId || existing.trainerId.toString() !== trainerId.toString())) {
      existing.trainerId = trainerId;
      await existing.save();
    }
  }
  logger.info(`Umas seeded: ${created} new (${SEED_UMAS.length - created} already existed/updated)`);
}
