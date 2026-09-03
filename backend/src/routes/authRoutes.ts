import { Router } from 'express';
import { login, getCurrentUser, getAllUsers, loginSchema } from '../controllers/authController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { validateBody } from '../middleware/validate';

export const authRoutes = Router();

authRoutes.post('/login', validateBody(loginSchema), login);
authRoutes.get('/me', authenticateToken, getCurrentUser);
authRoutes.get('/users', authenticateToken, authorizeRoles('ADMIN'), getAllUsers);