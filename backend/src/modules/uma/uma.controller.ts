import { Request, Response } from 'express';
import { Uma } from '../../models/Uma';
import { Trainer } from '../../models/Trainer';
import * as respond from '../../utils/responseHelper';

/**
 * GET /umas
 * List all active umas (public)
 */
export async function listUmas(req: Request, res: Response) {
  try {
    const filter: any = { isActive: true };

    if (req.query.search) {
      const searchRegex = new RegExp((req.query.search as string).trim(), 'i');
      const matchingTrainers = await Trainer.find({ name: searchRegex }).select('_id').lean();
      const trainerIds = matchingTrainers.map(t => t._id);

      filter.$or = [
        { name: searchRegex },
        { trainerId: { $in: trainerIds } },
      ];
    }

    if (req.query.trainerId) {
      filter.trainerId = req.query.trainerId;
    }

    if (req.query.page) {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 9));

      const [umas, total] = await Promise.all([
        Uma.find(filter)
          .populate('trainerId', 'name')
          .select('name imageUrl infoImageUrl galleryImages stats trainerId')
          .sort({ name: 1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Uma.countDocuments(filter),
      ]);

      return respond.paginated(res, umas, total, page, limit);
    }

    const umas = await Uma.find(filter)
      .populate('trainerId', 'name')
      .select('name imageUrl infoImageUrl galleryImages stats trainerId')
      .sort({ name: 1 })
      .lean();

    respond.success(res, umas);
  } catch (err) {
    respond.serverError(res, 'Failed to fetch umas');
  }
}

/**
 * GET /umas/:id
 * Get uma detail (public)
 */
export async function getUmaById(req: Request, res: Response) {
  try {
    const uma = await Uma.findById(req.params.id).lean();
    if (!uma) return respond.notFound(res, 'Uma not found');
    respond.success(res, uma);
  } catch (err) {
    respond.serverError(res, 'Failed to fetch uma');
  }
}
