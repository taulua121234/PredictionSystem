import mongoose, { Document, Schema } from 'mongoose';

export interface IUma extends Document {
  name: string;
  imageUrl?: string;
  infoImageUrl?: string;
  galleryImages: string[];
  stats?: {
    speed?: number;
    stamina?: number;
    power?: number;
    guts?: number;
    wisdom?: number;
  };
  isActive: boolean;
  trainerId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const umaSchema = new Schema<IUma>(
  {
    name: { type: String, required: true, trim: true },
    imageUrl: { type: String },
    infoImageUrl: { type: String },
    galleryImages: { type: [String], default: [] },
    stats: {
      speed: { type: Number },
      stamina: { type: Number },
      power: { type: Number },
      guts: { type: Number },
      wisdom: { type: Number },
    },
    isActive: { type: Boolean, default: true, index: true },
    trainerId: { type: Schema.Types.ObjectId, ref: 'Trainer', index: true },
  },
  { timestamps: true }
);

umaSchema.index({ name: 'text' });

export const Uma = mongoose.model<IUma>('Uma', umaSchema);
