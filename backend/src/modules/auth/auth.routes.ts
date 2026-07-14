import { Router } from 'express';
import { loginWithTicket, loginAdmin, getMe, renameUser } from './auth.controller';
import { authenticate, asyncHandler } from '../../middleware/auth';

const router: Router = Router();

router.post('/login-ticket', asyncHandler(loginWithTicket));
router.post('/login-admin', asyncHandler(loginAdmin));
router.get('/me', authenticate, asyncHandler(getMe));
router.put('/me/rename', authenticate, asyncHandler(renameUser));

export default router;
