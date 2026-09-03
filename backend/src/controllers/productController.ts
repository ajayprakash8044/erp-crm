import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

export const productSchema = z.object({
  name: z.string().min(2, 'Product name is required'),
  sku: z.string().min(2, 'SKU / Item code is required').toUpperCase(),
  category: z.string().min(2, 'Category is required'),
  unitPrice: z.number().min(0, 'Unit price must be 0 or positive'),
  currentStock: z.number().int().min(0, 'Current stock must be non-negative').default(0),
  minStockAlert: z.number().int().min(0, 'Min stock alert must be non-negative').default(10),
  location: z.string().min(1, 'Warehouse location/bay is required'),
});

export const updateProductSchema = productSchema.partial();

export const stockMovementSchema = z.object({
  quantity: z.number().int().positive('Quantity must be greater than 0'),
  movementType: z.enum(['IN', 'OUT']),
  reason: z.string().min(3, 'A clear reason for stock movement is required'),
});

export async function getProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const { search, category, lowStockOnly, page = '1', limit = '10' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const take = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 10));
    const skip = (pageNum - 1) * take;

    const where: any = {};

    if (category && typeof category === 'string' && category !== 'ALL') {
      where.category = category;
    }

    if (search && typeof search === 'string') {
      const q = search.trim();
      where.OR = [
        { name: { contains: q } },
        { sku: { contains: q } },
        { category: { contains: q } },
        { location: { contains: q } },
      ];
    }

    // Fetch products
    const [totalCount, allProducts] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip: lowStockOnly === 'true' ? undefined : skip,
        take: lowStockOnly === 'true' ? undefined : take,
        orderBy: { name: 'asc' },
      }),
    ]);

    // Compute low stock flag
    let productsWithAlerts = allProducts.map((p) => ({
      ...p,
      isLowStock: p.currentStock <= p.minStockAlert,
    }));

    if (lowStockOnly === 'true') {
      productsWithAlerts = productsWithAlerts.filter((p) => p.isLowStock);
      return res.status(200).json({
        success: true,
        data: {
          products: productsWithAlerts.slice(skip, skip + take),
          pagination: {
            totalCount: productsWithAlerts.length,
            currentPage: pageNum,
            totalPages: Math.ceil(productsWithAlerts.length / take) || 1,
            pageSize: take,
          },
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        products: productsWithAlerts,
        pagination: {
          totalCount,
          currentPage: pageNum,
          totalPages: Math.ceil(totalCount / take) || 1,
          pageSize: take,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getProductById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        stockMovements: {
          orderBy: { timestamp: 'desc' },
          take: 20,
        },
      },
    });

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    return res.status(200).json({
      success: true,
      data: {
        ...product,
        isLowStock: product.currentStock <= product.minStockAlert,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function createProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const data = req.body;

    const existing = await prisma.product.findUnique({
      where: { sku: data.sku.toUpperCase() },
    });

    if (existing) {
      throw new AppError(`Product with SKU '${data.sku.toUpperCase()}' already exists.`, 409);
    }

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: data.name,
          sku: data.sku.toUpperCase(),
          category: data.category,
          unitPrice: data.unitPrice,
          currentStock: data.currentStock,
          minStockAlert: data.minStockAlert,
          location: data.location,
        },
      });

      // If initial stock is greater than 0, create an initial IN movement record
      if (data.currentStock > 0) {
        await tx.stockMovement.create({
          data: {
            productId: created.id,
            quantityChanged: data.currentStock,
            movementType: 'IN',
            reason: 'Initial stock intake on creation',
            createdById: req.user?.id || null,
            createdByName: req.user?.name || 'System User',
          },
        });
      }

      return created;
    });

    return res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const data = req.body;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Product not found', 404);
    }

    if (data.sku && data.sku.toUpperCase() !== existing.sku) {
      const duplicate = await prisma.product.findUnique({
        where: { sku: data.sku.toUpperCase() },
      });
      if (duplicate) {
        throw new AppError(`Product SKU '${data.sku.toUpperCase()}' is already in use`, 409);
      }
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: data.name ?? existing.name,
        sku: data.sku ? data.sku.toUpperCase() : existing.sku,
        category: data.category ?? existing.category,
        unitPrice: data.unitPrice ?? existing.unitPrice,
        minStockAlert: data.minStockAlert ?? existing.minStockAlert,
        location: data.location ?? existing.location,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function recordStockMovement(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { quantity, movementType, reason } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id } });
      if (!product) {
        throw new AppError('Product not found', 404);
      }

      let newStock = product.currentStock;
      if (movementType === 'IN') {
        newStock += quantity;
      } else if (movementType === 'OUT') {
        if (product.currentStock < quantity) {
          throw new AppError(
            `Insufficient stock for '${product.name}'. Current stock: ${product.currentStock}, cannot deduct ${quantity}. Stock must not go negative.`,
            400
          );
        }
        newStock -= quantity;
      }

      const updatedProduct = await tx.product.update({
        where: { id },
        data: { currentStock: newStock },
      });

      const movement = await tx.stockMovement.create({
        data: {
          productId: id,
          quantityChanged: quantity,
          movementType,
          reason,
          createdById: req.user?.id || null,
          createdByName: req.user?.name || 'System User',
        },
      });

      return { product: updatedProduct, movement };
    });

    return res.status(200).json({
      success: true,
      message: `Stock successfully adjusted (${movementType}: ${quantity})`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getStockMovements(req: Request, res: Response, next: NextFunction) {
  try {
    const { productId, movementType, page = '1', limit = '15' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const take = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 15));
    const skip = (pageNum - 1) * take;

    const where: any = {};
    if (productId && typeof productId === 'string') {
      where.productId = productId;
    }
    if (movementType && typeof movementType === 'string' && movementType !== 'ALL') {
      where.movementType = movementType;
    }

    const [totalCount, movements] = await Promise.all([
      prisma.stockMovement.count({ where }),
      prisma.stockMovement.findMany({
        where,
        skip,
        take,
        orderBy: { timestamp: 'desc' },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              category: true,
            },
          },
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        movements,
        pagination: {
          totalCount,
          currentPage: pageNum,
          totalPages: Math.ceil(totalCount / take) || 1,
          pageSize: take,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}