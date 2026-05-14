import mongoose, { Document, Schema } from 'mongoose';

export type TransactionType = 'BET' | 'PAYOUT' | 'REFUND' | 'BONUS' | 'ADMIN_ADJUST';

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  raceId?: mongoose.Types.ObjectId;
  betId?: mongoose.Types.ObjectId;
  description?: string;
  createdAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'BettingUser', required: true, index: true },
    type: {
      type: String,
      enum: ['BET', 'PAYOUT', 'REFUND', 'BONUS', 'ADMIN_ADJUST'],
      required: true,
    },
    amount: { type: Number, required: true },
    balanceBefore: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    raceId: { type: Schema.Types.ObjectId, ref: 'Race' },
    betId: { type: Schema.Types.ObjectId, ref: 'Bet' },
    description: { type: String },
  },
  { timestamps: true }
);

transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ raceId: 1 });

export const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);
