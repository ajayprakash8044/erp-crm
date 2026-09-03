import { Router } from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  addFollowUpNote,
  customerSchema,
  followUpSchema,
} from '../controllers/customerController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { validateBody } from '../middleware/validate';

export const customerRoutes = Router();

customerRoutes.use(authenticateToken);

customerRoutes.get('/', getCustomers);
customerRoutes.post('/', authorizeRoles('SALES', 'ADMIN'), validateBody(customerSchema), createCustomer);
customerRoutes.get('/:id', getCustomerById);
customerRoutes.put('/:id', authorizeRoles('SALES', 'ADMIN'), updateCustomer);
customerRoutes.post('/:id/notes', authorizeRoles('SALES', 'ADMIN'), validateBody(followUpSchema), addFollowUpNote);