import { Request, Response } from 'express';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { Race, RaceState } from '../../models/Race';
import { Uma } from '../../models/Uma';
import { Trainer } from '../../models/Trainer';
import { BettingUser } from '../../models/User';
import { Transaction } from '../../models/Transaction';
import { Bet } from '../../models/Bet';
import * as respond from '../../utils/responseHelper';
import { createLogger } from '../../utils/logger';
import cloudinary from '../../utils/cloudinary';
import { normalizeEntriesForAdmin } from '../../utils/dynamicOdds';

const logger = createLogger('admin');

// ==================== Multer Config for Uma Info Images ====================

const storage = multer.memoryStorage();

export const uploadInfoImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
  },
});

export const uploadGalleryImages = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
  },
});

// ==================== Race Management ====================

const VALID_TRANSITIONS: Record<string, string[]> = {
  UPCOMING: ['BETTING_OPEN'],
  BETTING_OPEN: ['LOCKED'],
  LOCKED: ['FINISHED'],
  FINISHED: ['SETTLED'],
  SETTLED: [],
};

async function populateTrainerIdForEntries(entries: any[]) {
  if (!entries || !Array.isArray(entries)) return entries;
  for (const entry of entries) {
    if (entry.umaId) {
      const uma = await Uma.findById(entry.umaId).lean();
      if (uma && uma.trainerId) {
        entry.trainerId = uma.trainerId;
      } else {
        entry.trainerId = undefined;
      }
    }
  }
  return normalizeEntriesForAdmin(entries);
}

/**
 * POST /admin/races
 */
export async function createRace(req: Request, res: Response) {
  try {
    const { raceName, description, startTime, closeBetTime, entries } = req.body;

    if (!raceName || !startTime || !closeBetTime) {
      return respond.badRequest(res, 'raceName, startTime, closeBetTime are required');
    }

    const populatedEntries = await populateTrainerIdForEntries(entries || []);

    const race = await Race.create({
      raceName,
      description,
      startTime: new Date(startTime),
      closeBetTime: new Date(closeBetTime),
      entries: populatedEntries,
      state: 'UPCOMING',
    });

    logger.info(`Race created: ${raceName}`);
    respond.created(res, race);
  } catch (err) {
    logger.error('Create race error:', err);
    respond.serverError(res, 'Failed to create race');
  }
}

/**
 * PUT /admin/races/:id
 */
export async function updateRace(req: Request, res: Response) {
  try {
    const race = await Race.findById(req.params.id);
    if (!race) return respond.notFound(res, 'Race not found');

    const { raceName, description, startTime, closeBetTime, entries } = req.body;
    if (raceName) race.raceName = raceName;
    if (description !== undefined) race.description = description;
    if (startTime) race.startTime = new Date(startTime);
    if (closeBetTime) race.closeBetTime = new Date(closeBetTime);
    if (entries) {
      race.entries = await populateTrainerIdForEntries(entries);
    }

    await race.save();
    respond.success(res, race);
  } catch (err) {
    logger.error('Update race error:', err);
    respond.serverError(res, 'Failed to update race');
  }
}

/**
 * PATCH /admin/races/:id/state
 */
export async function changeRaceState(req: Request, res: Response) {
  try {
    const { state } = req.body;
    const race = await Race.findById(req.params.id);
    if (!race) return respond.notFound(res, 'Race not found');

    const validNext = VALID_TRANSITIONS[race.state] || [];
    if (!validNext.includes(state)) {
      return respond.badRequest(res, `Cannot transition from ${race.state} to ${state}. Valid: ${validNext.join(', ')}`);
    }

    race.state = state as RaceState;
    await race.save();

    logger.info(`Race ${race.raceName} → ${state}`);
    respond.success(res, race);
  } catch (err) {
    logger.error('Change race state error:', err);
    respond.serverError(res, 'Failed to change race state');
  }
}

/**
 * PATCH /admin/races/:id/result
 */
export async function setRaceResult(req: Request, res: Response) {
  try {
    const race = await Race.findById(req.params.id);
    if (!race) return respond.notFound(res, 'Race not found');

    if (race.state !== 'LOCKED' && race.state !== 'FINISHED') {
      return respond.badRequest(res, 'Race must be LOCKED or FINISHED to set result');
    }

    const { first, second, third, winnerTrainerId } = req.body;

    if (
      (second && first === second) ||
      (third && first === third) ||
      (second && third && second === third)
    ) {
      return respond.badRequest(res, 'Top 3 Umas must be unique');
    }

    race.result = { first, second, third, winnerTrainerId };
    race.state = 'FINISHED';
    await race.save();

    logger.info(`Race result set: ${race.raceName}`);
    respond.success(res, race);
  } catch (err) {
    logger.error('Set race result error:', err);
    respond.serverError(res, 'Failed to set race result');
  }
}

/**
 * DELETE /admin/races/:id
 * Delete a race (only if no bets placed, or if race is CANCELLED)
 */
export async function deleteRace(req: Request, res: Response) {
  try {
    const race = await Race.findById(req.params.id);
    if (!race) return respond.notFound(res, 'Race not found');

    if (race.state === 'CANCELLED') {
      await Bet.deleteMany({ raceId: race._id });
      await Race.findByIdAndDelete(race._id);
      logger.info(`Cancelled race deleted: ${race.raceName}`);
      return respond.success(res, { message: 'Race deleted' });
    }

    const betCount = await Bet.countDocuments({ raceId: race._id });
    if (betCount > 0) {
      return respond.badRequest(res, 'Không thể xóa race đã có người dự đoán. Hãy dùng chức năng Hủy Race để hoàn điểm.');
    }

    await Race.findByIdAndDelete(race._id);
    logger.info(`Race deleted: ${race.raceName}`);
    respond.success(res, { message: 'Race deleted' });
  } catch (err) {
    logger.error('Delete race error:', err);
    respond.serverError(res, 'Failed to delete race');
  }
}

/**
 * POST /admin/races/:id/cancel
 * Cancel a race and refund all pending bets
 */
export async function cancelRace(req: Request, res: Response) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const race = await Race.findById(req.params.id).session(session);
    if (!race) {
      await session.abortTransaction();
      return respond.notFound(res, 'Race not found');
    }

    if (race.state === 'SETTLED') {
      await session.abortTransaction();
      return respond.badRequest(res, 'Không thể hủy race đã thanh toán');
    }

    // Find all pending bets for this race
    const pendingBets = await Bet.find({ raceId: race._id, status: 'pending' }).session(session);

    // Aggregate refunds per user (reduce DB calls)
    const userRefunds = new Map<string, { totalAmount: number; totalBetDeduct: number; betIds: mongoose.Types.ObjectId[] }>();
    for (const bet of pendingBets) {
      const uid = bet.userId.toString();
      const existing = userRefunds.get(uid);
      if (existing) {
        existing.totalAmount += bet.amount;
        existing.totalBetDeduct += bet.amount;
        existing.betIds.push(bet._id);
      } else {
        userRefunds.set(uid, { totalAmount: bet.amount, totalBetDeduct: bet.amount, betIds: [bet._id] });
      }
    }

    // Batch update all bets to refunded
    if (pendingBets.length > 0) {
      await Bet.updateMany(
        { raceId: race._id, status: 'pending' },
        { $set: { status: 'refunded' } },
        { session }
      );
    }

    // Update each user and create transaction logs
    let refundedCount = pendingBets.length;
    let totalRefunded = 0;
    const transactionDocs: any[] = [];
    const pointUpdates = new Map<string, number>();

    for (const [userId, data] of userRefunds) {
      const user = await BettingUser.findById(userId).session(session);
      if (!user) continue;

      const balanceBefore = user.currentPoints;
      user.currentPoints += data.totalAmount;
      user.totalBet -= data.totalBetDeduct;
      await user.save({ session });

      pointUpdates.set(userId, user.currentPoints);
      totalRefunded += data.totalAmount;

      transactionDocs.push({
        userId: user._id,
        type: 'REFUND',
        amount: data.totalAmount,
        balanceBefore,
        balanceAfter: user.currentPoints,
        raceId: race._id,
        description: `Hoàn điểm do hủy race: ${race.raceName}`,
      });
    }

    if (transactionDocs.length > 0) {
      await Transaction.insertMany(transactionDocs, { session });
    }

    race.state = 'CANCELLED';
    await race.save({ session });

    await session.commitTransaction();

    // Broadcast point updates (outside transaction)
    const io = req.app.get('io');
    if (io) {
      pointUpdates.forEach((currentPoints, userId) => {
        io.to(`user:${userId}`).emit('user:point', { currentPoints });
      });
    }

    logger.info(`Race cancelled: ${race.raceName}. Refunded ${refundedCount} bets, total ${totalRefunded} points`);
    respond.success(res, {
      message: `Đã hủy race và hoàn ${totalRefunded.toLocaleString()} điểm cho ${refundedCount} lượt dự đoán`,
      refundedCount,
      totalRefunded,
    });
  } catch (err) {
    await session.abortTransaction();
    logger.error('Cancel race error:', err);
    respond.serverError(res, 'Failed to cancel race');
  } finally {
    session.endSession();
  }
}

// ==================== Uma Management ====================

/**
 * POST /admin/umas
 */
export async function createUma(req: Request, res: Response) {
  try {
    const { trainerId, name } = req.body;

    const duplicate = await Uma.findOne({ name, trainerId });
    if (duplicate) {
      return respond.badRequest(res, 'An Uma with this name and trainer already exists');
    }

    if (trainerId) {
      const umaCount = await Uma.countDocuments({ trainerId });
      if (umaCount >= 4) {
        return respond.badRequest(res, 'Trainer already has maximum of 4 Umas');
      }
    }

    const uma = await Uma.create(req.body);
    respond.created(res, uma);
  } catch (err: any) {
    if (err.code === 11000) return respond.conflict(res, 'Uma name already exists');
    logger.error('Create uma error:', err);
    respond.serverError(res, 'Failed to create uma');
  }
}

/**
 * PUT /admin/umas/:id
 */
export async function updateUma(req: Request, res: Response) {
  try {
    const { trainerId, name } = req.body;
    const existingUma = await Uma.findById(req.params.id);
    if (!existingUma) return respond.notFound(res, 'Uma not found');

    const duplicate = await Uma.findOne({ 
      name: name || existingUma.name, 
      trainerId: trainerId !== undefined ? trainerId : existingUma.trainerId, 
      _id: { $ne: req.params.id } 
    });
    if (duplicate) {
      return respond.badRequest(res, 'An Uma with this name and trainer already exists');
    }

    if (trainerId && trainerId !== existingUma.trainerId?.toString()) {
      const umaCount = await Uma.countDocuments({ trainerId });
      if (umaCount >= 4) {
        return respond.badRequest(res, 'New trainer already has maximum of 4 Umas');
      }
    }

    const uma = await Uma.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    respond.success(res, uma);
  } catch (err) {
    logger.error('Update uma error:', err);
    respond.serverError(res, 'Failed to update uma');
  }
}

/**
 * DELETE /admin/umas/:id
 */
export async function deleteUma(req: Request, res: Response) {
  try {
    const uma = await Uma.findByIdAndDelete(req.params.id);
    if (!uma) return respond.notFound(res, 'Uma not found');
    respond.success(res, { message: 'Uma deleted' });
  } catch (err) {
    logger.error('Delete uma error:', err);
    respond.serverError(res, 'Failed to delete uma');
  }
}

/**
 * POST /admin/umas/:id/info-image
 * Upload uma info image
 */
export async function uploadUmaInfoImage(req: Request, res: Response) {
  try {
    if (!req.file) {
      return respond.badRequest(res, 'No image file uploaded');
    }

    const uma = await Uma.findById(req.params.id);
    if (!uma) {
      return respond.notFound(res, 'Uma not found');
    }

    // Convert buffer to base64
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = "data:" + req.file.mimetype + ";base64," + b64;
    
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'evient/uma-info',
      public_id: `uma-info-${Date.now()}`
    });

    uma.infoImageUrl = result.secure_url;
    await uma.save();

    logger.info(`Uma info image uploaded to Cloudinary: ${uma.name}`);
    respond.success(res, { infoImageUrl: uma.infoImageUrl });
  } catch (err) {
    logger.error('Upload uma info image error:', err);
    respond.serverError(res, 'Failed to upload image');
  }
}

// ==================== Uma Gallery ====================

/**
 * POST /admin/umas/:id/gallery
 * Upload multiple images to uma gallery
 */
export async function uploadUmaGallery(req: Request, res: Response) {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return respond.badRequest(res, 'No image files uploaded');
    }

    const uma = await Uma.findById(req.params.id);
    if (!uma) {
      return respond.notFound(res, 'Uma not found');
    }

    // Upload all files to Cloudinary in parallel
    const uploadPromises = files.map(async (file) => {
      const b64 = Buffer.from(file.buffer).toString('base64');
      const dataURI = `data:${file.mimetype};base64,${b64}`;
      const result = await cloudinary.uploader.upload(dataURI, {
        folder: 'evient/uma-gallery',
        public_id: `uma-gallery-${uma._id}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      });
      return result.secure_url;
    });

    const uploadedUrls = await Promise.all(uploadPromises);
    uma.galleryImages.push(...uploadedUrls);
    await uma.save();

    logger.info(`${uploadedUrls.length} gallery images uploaded for Uma: ${uma.name}`);
    respond.success(res, { galleryImages: uma.galleryImages });
  } catch (err) {
    logger.error('Upload uma gallery error:', err);
    respond.serverError(res, 'Failed to upload gallery images');
  }
}

/**
 * DELETE /admin/umas/:id/gallery
 * Remove an image from uma gallery
 * Body: { imageUrl: string }
 */
export async function deleteUmaGalleryImage(req: Request, res: Response) {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return respond.badRequest(res, 'imageUrl is required');
    }

    const uma = await Uma.findById(req.params.id);
    if (!uma) {
      return respond.notFound(res, 'Uma not found');
    }

    const index = uma.galleryImages.indexOf(imageUrl);
    if (index === -1) {
      return respond.notFound(res, 'Image not found in gallery');
    }

    // Extract public_id from Cloudinary URL and delete
    try {
      const urlParts = imageUrl.split('/');
      const folderAndFile = urlParts.slice(urlParts.indexOf('evient')).join('/');
      const publicId = folderAndFile.replace(/\.[^/.]+$/, ''); // Remove extension
      await cloudinary.uploader.destroy(publicId);
    } catch (cloudErr) {
      logger.warn('Failed to delete image from Cloudinary (continuing):', cloudErr);
    }

    uma.galleryImages.splice(index, 1);

    // Also clear infoImageUrl if it matches the deleted image
    if (uma.infoImageUrl === imageUrl) {
      uma.infoImageUrl = undefined;
    }

    await uma.save();

    logger.info(`Gallery image removed for Uma: ${uma.name}`);
    respond.success(res, { galleryImages: uma.galleryImages });
  } catch (err) {
    logger.error('Delete uma gallery image error:', err);
    respond.serverError(res, 'Failed to delete gallery image');
  }
}

// ==================== Trainer Management ====================

/**
 * GET /admin/trainers
 */
export async function listTrainers(req: Request, res: Response) {
  try {
    const trainers = await Trainer.find().sort({ createdAt: -1 }).lean();
    respond.success(res, trainers);
  } catch (err) {
    logger.error('List trainers error:', err);
    respond.serverError(res, 'Failed to list trainers');
  }
}

/**
 * POST /admin/trainers
 */
export async function createTrainer(req: Request, res: Response) {
  try {
    const trainer = await Trainer.create(req.body);
    respond.created(res, trainer);
  } catch (err: any) {
    if (err.code === 11000) return respond.conflict(res, 'Trainer name already exists');
    logger.error('Create trainer error:', err);
    respond.serverError(res, 'Failed to create trainer');
  }
}

/**
 * PUT /admin/trainers/:id
 */
export async function updateTrainer(req: Request, res: Response) {
  try {
    const trainer = await Trainer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!trainer) return respond.notFound(res, 'Trainer not found');
    respond.success(res, trainer);
  } catch (err) {
    logger.error('Update trainer error:', err);
    respond.serverError(res, 'Failed to update trainer');
  }
}

/**
 * DELETE /admin/trainers/:id
 */
export async function deleteTrainer(req: Request, res: Response) {
  try {
    const trainer = await Trainer.findByIdAndDelete(req.params.id);
    if (!trainer) return respond.notFound(res, 'Trainer not found');
    respond.success(res, { message: 'Trainer deleted' });
  } catch (err) {
    logger.error('Delete trainer error:', err);
    respond.serverError(res, 'Failed to delete trainer');
  }
}

// ==================== User Management ====================

/**
 * GET /admin/users
 */
export async function listUsers(req: Request, res: Response) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);

    const [users, total] = await Promise.all([
      BettingUser.find({ role: 'user' })
        .select('-passwordHash')
        .sort({ currentPoints: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      BettingUser.countDocuments({ role: 'user' }),
    ]);

    respond.paginated(res, users, total, page, limit);
  } catch (err) {
    logger.error('List users error:', err);
    respond.serverError(res, 'Failed to fetch users');
  }
}

/**
 * PATCH /admin/users/:id/adjust-points
 */
export async function adjustPoints(req: Request, res: Response) {
  try {
    const { amount, description } = req.body;
    if (typeof amount !== 'number') {
      return respond.badRequest(res, 'amount is required (positive or negative)');
    }

    const user = await BettingUser.findById(req.params.id);
    if (!user) return respond.notFound(res, 'User not found');

    const balanceBefore = user.currentPoints;
    user.currentPoints += amount;
    if (user.currentPoints < 0) user.currentPoints = 0;
    await user.save();

    await Transaction.create({
      userId: user._id,
      type: 'ADMIN_ADJUST',
      amount,
      balanceBefore,
      balanceAfter: user.currentPoints,
      description: description || `Admin adjustment: ${amount > 0 ? '+' : ''}${amount}`,
    });

    logger.info(`Points adjusted: ${user.username} ${amount > 0 ? '+' : ''}${amount}`);
    respond.success(res, { currentPoints: user.currentPoints });
  } catch (err) {
    logger.error('Adjust points error:', err);
    respond.serverError(res, 'Failed to adjust points');
  }
}

/**
 * DELETE /admin/users/:id
 */
export async function deleteUser(req: Request, res: Response) {
  try {
    const user = await BettingUser.findById(req.params.id);
    if (!user) return respond.notFound(res, 'User not found');
    if (user.role === 'admin') return respond.badRequest(res, 'Cannot delete admin');

    await BettingUser.findByIdAndDelete(req.params.id);
    await Bet.deleteMany({ userId: user._id });
    await Transaction.deleteMany({ userId: user._id });

    logger.info(`User deleted: ${user.username}`);
    respond.success(res, { message: 'User deleted' });
  } catch (err) {
    logger.error('Delete user error:', err);
    respond.serverError(res, 'Failed to delete user');
  }
}

/**
 * PATCH /admin/users/:id/lock
 */
export async function toggleLockUser(req: Request, res: Response) {
  try {
    const user = await BettingUser.findById(req.params.id);
    if (!user) return respond.notFound(res, 'User not found');
    if (user.role === 'admin') return respond.badRequest(res, 'Cannot lock admin');

    user.isLocked = !user.isLocked;
    await user.save();

    logger.info(`User ${user.username} isLocked set to ${user.isLocked}`);
    respond.success(res, { isLocked: user.isLocked });
  } catch (err) {
    logger.error('Lock user error:', err);
    respond.serverError(res, 'Failed to toggle user lock status');
  }
}

// ==================== Dashboard Stats ====================

/**
 * GET /admin/stats
 */
export async function getDashboardStats(req: Request, res: Response) {
  try {
    const [totalUsers, totalBets, totalRaces, activeRaces] = await Promise.all([
      BettingUser.countDocuments({ role: 'user' }),
      Bet.countDocuments(),
      Race.countDocuments(),
      Race.countDocuments({ state: { $in: ['BETTING_OPEN', 'LOCKED'] } }),
    ]);

    const totalPointsBet = await Bet.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    respond.success(res, {
      totalUsers,
      totalBets,
      totalRaces,
      activeRaces,
      totalPointsBet: totalPointsBet[0]?.total || 0,
    });
  } catch (err) {
    logger.error('Dashboard stats error:', err);
    respond.serverError(res, 'Failed to fetch stats');
  }
}
