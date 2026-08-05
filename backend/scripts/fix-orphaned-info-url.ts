import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import mongoose from 'mongoose';

async function fix() {
  const uri = `${(process.env.MONGODB_URI || '').replace(/\/$/, '')}/${process.env.MONGODB_BETTING_DB || 'betting_db'}`;
  console.log('Connecting to', uri);
  await mongoose.connect(uri);

  const col = mongoose.connection.collection('umas');
  const umas = await col.find({}).toArray();

  for (const uma of umas) {
    const gallery: string[] = uma.galleryImages || [];
    if (uma.infoImageUrl && !gallery.includes(uma.infoImageUrl)) {
      await col.updateOne({ _id: uma._id }, { $unset: { infoImageUrl: '' } });
      console.log(`Cleared orphaned infoImageUrl for: ${uma.name}`);
    }
  }

  console.log('Done');
  await mongoose.disconnect();
}

fix().catch((e) => { console.error(e); process.exit(1); });
