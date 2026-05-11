import { Router } from 'express';
import { loginWithTicket, loginAdmin, getMe } from './auth.controller';
import { authenticate, asyncHandler } from '../../middleware/auth';

const router = Router();

router.post('/login-ticket', asyncHandler(loginWithTicket));
router.post('/login-admin', asyncHandler(loginAdmin));
router.get('/me', authenticate, asyncHandler(getMe));

export default router;
