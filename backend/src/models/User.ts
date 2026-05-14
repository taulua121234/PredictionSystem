import mongoose, { Document, Schema } from 'mongoose';

export interface IBettingUser extends Document {
  ticketCode: string;
  username: string;
  tier: string;
  startingPoints: number;
  currentPoints: number;
  totalBet: number;
  totalPayout: number;
  role: 'user' | 'admin';
  passwordHash?: string;
  isActive: boolean;
  isLocked: boolean;
  hasChangedName: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const bettingUserSchema = new Schema<IBettingUser>(
  {
    ticketCode: { type: String, unique: true, sparse: true, index: true },
    username: { type: String, required: true, trim: true },
    tier: {
      type: String,
      enum: ['NORMAL', 'VIP', 'DELUXE'],
      default: 'NORMAL',
    },
    startingPoints: { type: Number, required: true, default: 3000 },
    currentPoints: { type: Number, required: true, default: 3000 },
    totalBet: { type: Number, default: 0 },
    totalPayout: { type: Number, default: 0 },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
      index: true,
    },
    passwordHash: { type: String },
    isActive: { type: Boolean, default: true },
    isLocked: { type: Boolean, default: false },
    hasChangedName: { type: Boolean, default: false },
  },
  { timestamps: true }
);

bettingUserSchema.index({ currentPoints: -1 });
bettingUserSchema.index({ username: 'text' });

export const BettingUser = mongoose.model<IBettingUser>('BettingUser', bettingUserSchema);
