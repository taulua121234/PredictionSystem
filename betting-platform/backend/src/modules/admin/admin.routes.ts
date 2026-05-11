import { Router } from 'express';
import { authenticate, adminOnly, asyncHandler } from '../../middleware/auth';
import { settleRace } from '../settlement/settlement.controller';
import {
  createRace, updateRace, changeRaceState, setRaceResult,
  createUma, updateUma, deleteUma, uploadUmaInfoImage, uploadInfoImage,
  createTrainer, updateTrainer, deleteTrainer, listTrainers,
  listUsers, adjustPoints, deleteUser, toggleLockUser,
  getDashboardStats,
} from './admin.controller';

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate, adminOnly);

// Dashboard
router.get('/stats', asyncHandler(getDashboardStats));

// Race management
router.post('/races', asyncHandler(createRace));
router.put('/races/:id', asyncHandler(updateRace));
router.patch('/races/:id/state', asyncHandler(changeRaceState));
router.patch('/races/:id/result', asyncHandler(setRaceResult));
router.post('/races/:id/settle', asyncHandler(settleRace));

// Uma management
router.post('/umas', asyncHandler(createUma));
router.put('/umas/:id', asyncHandler(updateUma));
router.delete('/umas/:id', asyncHandler(deleteUma));
router.post('/umas/:id/info-image', uploadInfoImage.single('infoImage'), asyncHandler(uploadUmaInfoImage));

// Trainer management
router.get('/trainers', asyncHandler(listTrainers));
router.post('/trainers', asyncHandler(createTrainer));
router.put('/trainers/:id', asyncHandler(updateTrainer));
router.delete('/trainers/:id', asyncHandler(deleteTrainer));

// User management
router.get('/users', asyncHandler(listUsers));
router.patch('/users/:id/adjust-points', asyncHandler(adjustPoints));
router.delete('/users/:id', asyncHandler(deleteUser));
router.patch('/users/:id/lock', asyncHandler(toggleLockUser));

export default router;
