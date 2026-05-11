import { Router } from 'express';
import { getIncomeLeaderboard, getRoiLeaderboard, getPointsLeaderboard } from './leaderboard.controller';
import { asyncHandler } from '../../middleware/auth';

const router = Router();

router.get('/income', asyncHandler(getIncomeLeaderboard));
router.get('/roi', asyncHandler(getRoiLeaderboard));
router.get('/points', asyncHandler(getPointsLeaderboard));

export default router;
