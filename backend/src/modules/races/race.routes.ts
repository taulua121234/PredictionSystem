import { Router } from 'express';
import { listRaces, getRaceById } from './race.controller';
import { asyncHandler } from '../../middleware/auth';

const router: Router = Router();

router.get('/', asyncHandler(listRaces));
router.get('/:id', asyncHandler(getRaceById));

export default router;
