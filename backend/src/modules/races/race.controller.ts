import { Request, Response } from 'express';
import { Race } from '../../models/Race';
import * as respond from '../../utils/responseHelper';
import { createLogger } from '../../utils/logger';

const logger = createLogger('races');

/**
 * GET /races
 * List all races (public)
 */
export async function listRaces(req: Request, res: Response) {
  try {
    const { state } = req.query;
    const filter: any = {};
    if (state) filter.state = state;

    const races = await Race.find(filter)
      .populate('entries.umaId', 'name imageUrl')
      .populate('entries.trainerId', 'name')
      .sort({ startTime: -1 })
      .lean();

    respond.success(res, races);
  } catch (err) {
    logger.error('List races error:', err);
    respond.serverError(res, 'Failed to fetch races');
  }
}

/**
 * GET /races/:id
 * Get race detail with populated entries
 */
export async function getRaceById(req: Request, res: Response) {
  try {
    const race = await Race.findById(req.params.id)
      .populate('entries.umaId', 'name imageUrl infoImageUrl stats')
      .populate('entries.trainerId', 'name imageUrl')
      .populate('result.first', 'name imageUrl')
      .populate('result.second', 'name imageUrl')
      .populate('result.third', 'name imageUrl')
      .lean();

    if (!race) {
      return respond.notFound(res, 'Race not found');
    }

    respond.success(res, race);
  } catch (err) {
    logger.error('Get race error:', err);
    respond.serverError(res, 'Failed to fetch race');
  }
}
