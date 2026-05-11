import mongoose, { Document, Schema } from 'mongoose';

export interface IUma extends Document {
  name: string;
  imageUrl?: string;
  infoImageUrl?: string;
  stats?: {
    speed?: number;
    stamina?: number;
    power?: number;
    guts?: number;
    wisdom?: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const umaSchema = new Schema<IUma>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    imageUrl: { type: String },
    infoImageUrl: { type: String },
    stats: {
      speed: { type: Number, min: 0, max: 100 },
      stamina: { type: Number, min: 0, max: 100 },
      power: { type: Number, min: 0, max: 100 },
      guts: { type: Number, min: 0, max: 100 },
      wisdom: { type: Number, min: 0, max: 100 },
    },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

umaSchema.index({ name: 'text' });

export const Uma = mongoose.model<IUma>('Uma', umaSchema);
