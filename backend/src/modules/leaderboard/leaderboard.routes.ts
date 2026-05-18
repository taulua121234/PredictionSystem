import { Router } from 'express';
import { getIncomeLeaderboard, getRoiLeaderboard, getPointsLeaderboard, getLeaderboardStats } from './leaderboard.controller';
import { asyncHandler } from '../../middleware/auth';

const router = Router();

router.get('/income', asyncHandler(getIncomeLeaderboard));
router.get('/roi', asyncHandler(getRoiLeaderboard));
router.get('/points', asyncHandler(getPointsLeaderboard));
router.get('/stats', asyncHandler(getLeaderboardStats));

export default router;
