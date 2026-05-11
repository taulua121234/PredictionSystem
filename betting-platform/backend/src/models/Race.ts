import mongoose, { Document, Schema } from 'mongoose';

export type RaceState = 'UPCOMING' | 'BETTING_OPEN' | 'LOCKED' | 'FINISHED' | 'SETTLED';

export interface IRaceEntry {
  umaId: mongoose.Types.ObjectId;
  trainerId?: mongoose.Types.ObjectId;
  odd: number;
}

export interface IRaceResult {
  first?: mongoose.Types.ObjectId;   // Uma ID
  second?: mongoose.Types.ObjectId;
  third?: mongoose.Types.ObjectId;
  winnerTrainerId?: mongoose.Types.ObjectId;
}

export interface IRace extends Document {
  raceName: string;
  description?: string;
  state: RaceState;
  startTime: Date;
  closeBetTime: Date;
  entries: IRaceEntry[];
  result?: IRaceResult;
  createdAt: Date;
  updatedAt: Date;
}

const raceEntrySchema = new Schema<IRaceEntry>(
  {
    umaId: { type: Schema.Types.ObjectId, ref: 'Uma', required: true },
    trainerId: { type: Schema.Types.ObjectId, ref: 'Trainer' },
    odd: { type: Number, required: true, min: 1.01 },
  },
  { _id: false }
);

const raceResultSchema = new Schema<IRaceResult>(
  {
    first: { type: Schema.Types.ObjectId, ref: 'Uma' },
    second: { type: Schema.Types.ObjectId, ref: 'Uma' },
    third: { type: Schema.Types.ObjectId, ref: 'Uma' },
    winnerTrainerId: { type: Schema.Types.ObjectId, ref: 'Trainer' },
  },
  { _id: false }
);

const raceSchema = new Schema<IRace>(
  {
    raceName: { type: String, required: true, trim: true },
    description: { type: String },
    state: {
      type: String,
      enum: ['UPCOMING', 'BETTING_OPEN', 'LOCKED', 'FINISHED', 'SETTLED'],
      default: 'UPCOMING',
      index: true,
    },
    startTime: { type: Date, required: true },
    closeBetTime: { type: Date, required: true },
    entries: [raceEntrySchema],
    result: raceResultSchema,
  },
  { timestamps: true }
);

raceSchema.index({ state: 1, startTime: 1 });

export const Race = mongoose.model<IRace>('Race', raceSchema);
