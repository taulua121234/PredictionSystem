/**
 * Migration: Move infoImageUrl into galleryImages
 * 
 * For all Umas that have an infoImageUrl but galleryImages doesn't include it,
 * prepend infoImageUrl to galleryImages array.
 * 
 * Run: npx tsx scripts/migrate-info-to-gallery.ts
 */
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const BETTING_DB = process.env.MONGODB_BETTING_DB || 'betting_db';

async function migrate() {
  const uri = `${MONGO_URI.replace(/\/$/, '')}/${BETTING_DB}`;
  console.log(`Connecting to ${uri}...`);
  await mongoose.connect(uri);

  const Uma = mongoose.connection.collection('umas');

  // Find all umas with infoImageUrl set
  const umas = await Uma.find({ infoImageUrl: { $exists: true, $ne: null, $ne: '' } }).toArray();
  console.log(`Found ${umas.length} Umas with infoImageUrl`);

  let migrated = 0;
  for (const uma of umas) {
    const gallery: string[] = uma.galleryImages || [];
    const infoUrl: string = uma.infoImageUrl;

    // Skip if already in gallery
    if (gallery.includes(infoUrl)) {
      console.log(`  ⏭  ${uma.name} — already in gallery, skipping`);
      continue;
    }

    // Prepend infoImageUrl to galleryImages
    await Uma.updateOne(
      { _id: uma._id },
      { $set: { galleryImages: [infoUrl, ...gallery] } }
    );
    migrated++;
    console.log(`  ✅ ${uma.name} — migrated infoImageUrl to galleryImages[0]`);
  }

  console.log(`\nDone! Migrated ${migrated}/${umas.length} Umas.`);
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
