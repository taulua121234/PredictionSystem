import mongoose, { Document, Schema } from 'mongoose';

export interface ITrainer extends Document {
  name: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const trainerSchema = new Schema<ITrainer>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    imageUrl: { type: String },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

trainerSchema.index({ name: 'text' });

export const Trainer = mongoose.model<ITrainer>('Trainer', trainerSchema);
