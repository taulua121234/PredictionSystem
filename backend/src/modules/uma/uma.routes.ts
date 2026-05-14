import { Router } from 'express';
import { listUmas, getUmaById } from './uma.controller';
import { asyncHandler } from '../../middleware/auth';

const router = Router();

router.get('/', asyncHandler(listUmas));
router.get('/:id', asyncHandler(getUmaById));

export default router;
