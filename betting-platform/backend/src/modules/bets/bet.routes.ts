import { Router } from 'express';
import { placeBet, getBetHistory, getRaceBetStats } from './bet.controller';
import { authenticate, asyncHandler } from '../../middleware/auth';

const router = Router();

router.post('/place', authenticate, asyncHandler(placeBet));
router.get('/history', authenticate, asyncHandler(getBetHistory));
router.get('/race/:raceId/stats', asyncHandler(getRaceBetStats));

export default router;
