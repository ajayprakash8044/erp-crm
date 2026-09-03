import { Router } from 'express';
import {
  getChallans,
  getChallanById,
  createChallan,
  updateChallanStatus,
  createChallanSchema,
  updateStatusSchema,
} from '../controllers/challanController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { validateBody } from '../middleware/validate';

export const challanRoutes = Router();

challanRoutes.use(authenticateToken);

challanRoutes.get('/', getChallans);
challanRoutes.post('/', authorizeRoles('SALES', 'ADMIN'), validateBody(createChallanSchema), createChallan);
challanRoutes.get('/:id', getChallanById);
challanRoutes.patch(
  '/:id/status',
  authorizeRoles('SALES', 'WAREHOUSE', 'ADMIN'),
  validateBody(updateStatusSchema),
  updateChallanStatus
);