import mongoose, { Document, Schema } from 'mongoose';

export type BetCategory = 'UMA_WIN' | 'TRAINER_WIN' | 'TRIFECTA';
export type BetStatus = 'pending' | 'won' | 'lost' | 'refunded';

export interface IBet extends Document {
  userId: mongoose.Types.ObjectId;
  raceId: mongoose.Types.ObjectId;
  category: BetCategory;
  prediction: {
    umaId?: mongoose.Types.ObjectId;       // For UMA_WIN
    trainerId?: mongoose.Types.ObjectId;    // For TRAINER_WIN
    first?: mongoose.Types.ObjectId;        // For TRIFECTA
    second?: mongoose.Types.ObjectId;
    third?: mongoose.Types.ObjectId;
  };
  amount: number;
  oddAtBetTime: number;
  payout: number;
  status: BetStatus;
  createdAt: Date;
  updatedAt: Date;
}

const betSchema = new Schema<IBet>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'BettingUser', required: true, index: true },
    raceId: { type: Schema.Types.ObjectId, ref: 'Race', required: true, index: true },
    category: {
      type: String,
      enum: ['UMA_WIN', 'TRAINER_WIN', 'TRIFECTA'],
      required: true,
    },
    prediction: {
      umaId: { type: Schema.Types.ObjectId, ref: 'Uma' },
      trainerId: { type: Schema.Types.ObjectId, ref: 'Trainer' },
      first: { type: Schema.Types.ObjectId, ref: 'Uma' },
      second: { type: Schema.Types.ObjectId, ref: 'Uma' },
      third: { type: Schema.Types.ObjectId, ref: 'Uma' },
    },
    amount: { type: Number, required: true, min: 0 },
    oddAtBetTime: { type: Number, required: true, min: 1 },
    payout: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'won', 'lost', 'refunded'],
      default: 'pending',
      index: true,
    },
  },
  { timestamps: true }
);

betSchema.index({ userId: 1, raceId: 1 });
betSchema.index({ raceId: 1, status: 1 });
betSchema.index({ raceId: 1, category: 1 });

export const Bet = mongoose.model<IBet>('Bet', betSchema);
