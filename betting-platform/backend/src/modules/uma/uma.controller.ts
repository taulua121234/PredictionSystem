import { Request, Response } from 'express';
import { Uma } from '../../models/Uma';
import * as respond from '../../utils/responseHelper';

/**
 * GET /umas
 * List all active umas (public)
 */
export async function listUmas(req: Request, res: Response) {
  try {
    const umas = await Uma.find({ isActive: true })
      .select('name imageUrl infoImageUrl stats')
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
