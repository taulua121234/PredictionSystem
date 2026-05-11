import { Request, Response } from 'express';
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

const logger = createLogger('admin');

// ==================== Multer Config for Uma Info Images ====================

const uploadsDir = path.join(__dirname, '../../../uploads/uma-info');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `uma-info-${Date.now()}${ext}`;
    cb(null, name);
  },
});

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

// ==================== Race Management ====================

const VALID_TRANSITIONS: Record<string, string[]> = {
  UPCOMING: ['BETTING_OPEN'],
  BETTING_OPEN: ['LOCKED'],
  LOCKED: ['FINISHED'],
  FINISHED: ['SETTLED'],
  SETTLED: [],
};

/**
 * POST /admin/races
 */
export async function createRace(req: Request, res: Response) {
  try {
    const { raceName, description, startTime, closeBetTime, entries } = req.body;

    if (!raceName || !startTime || !closeBetTime) {
      return respond.badRequest(res, 'raceName, startTime, closeBetTime are required');
    }

    const race = await Race.create({
      raceName,
      description,
      startTime: new Date(startTime),
      closeBetTime: new Date(closeBetTime),
      entries: entries || [],
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
    if (entries) race.entries = entries;

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

// ==================== Uma Management ====================

/**
 * POST /admin/umas
 */
export async function createUma(req: Request, res: Response) {
  try {
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
    const uma = await Uma.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!uma) return respond.notFound(res, 'Uma not found');
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
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return respond.notFound(res, 'Uma not found');
    }

    // Delete old image if exists
    if (uma.infoImageUrl) {
      const oldPath = path.join(uploadsDir, path.basename(uma.infoImageUrl));
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    uma.infoImageUrl = `/uploads/uma-info/${req.file.filename}`;
    await uma.save();

    logger.info(`Uma info image uploaded: ${uma.name}`);
    respond.success(res, { infoImageUrl: uma.infoImageUrl });
  } catch (err) {
    logger.error('Upload uma info image error:', err);
    respond.serverError(res, 'Failed to upload image');
  }
}

// ==================== Trainer Management ====================

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
