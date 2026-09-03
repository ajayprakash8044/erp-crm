import { Router } from 'express';
import {
  getInvoices,
  getInvoiceById,
  createInvoiceFromChallan,
  updateInvoiceStatus,
  createInvoiceSchema,
  updateInvoiceStatusSchema,
} from '../controllers/invoiceController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { validateBody } from '../middleware/validate';

export const invoiceRoutes = Router();

invoiceRoutes.use(authenticateToken);

invoiceRoutes.get('/', getInvoices);
invoiceRoutes.get('/:id', getInvoiceById);
invoiceRoutes.post(
  '/from-challan/:challanId',
  authorizeRoles('ACCOUNTS', 'ADMIN'),
  validateBody(createInvoiceSchema),
  createInvoiceFromChallan
);
invoiceRoutes.patch(
  '/:id/status',
  authorizeRoles('ACCOUNTS', 'ADMIN'),
  validateBody(updateInvoiceStatusSchema),
  updateInvoiceStatus
);