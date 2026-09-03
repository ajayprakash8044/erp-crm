import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  recordStockMovement,
  getStockMovements,
  productSchema,
  stockMovementSchema,
} from '../controllers/productController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { validateBody } from '../middleware/validate';

export const productRoutes = Router();

productRoutes.use(authenticateToken);

productRoutes.get('/', getProducts);
productRoutes.get('/movements', getStockMovements);
productRoutes.get('/:id', getProductById);
productRoutes.post('/', authorizeRoles('WAREHOUSE', 'ADMIN'), validateBody(productSchema), createProduct);
productRoutes.put('/:id', authorizeRoles('WAREHOUSE', 'ADMIN'), updateProduct);
productRoutes.post(
  '/:id/stock-movement',
  authorizeRoles('WAREHOUSE', 'ADMIN'),
  validateBody(stockMovementSchema),
  recordStockMovement
);