import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboardController';
import { authenticateToken } from '../middleware/auth';

export const dashboardRoutes = Router();

dashboardRoutes.use(authenticateToken);
dashboardRoutes.get('/stats', getDashboardStats);