import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { generateChallanNumber } from '../utils/generateNumber';
import { AppError } from '../middleware/errorHandler';

export const challanItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().int().positive('Quantity must be greater than 0'),
});

export const createChallanSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  status: z.enum(['Draft', 'Confirmed']).default('Draft'),
  notes: z.string().optional().nullable(),
  items: z.array(challanItemSchema).min(1, 'At least one product item is required'),
});

export const updateStatusSchema = z.object({
  status: z.enum(['Draft', 'Confirmed', 'Cancelled']),
});

export async function getChallans(req: Request, res: Response, next: NextFunction) {
  try {
    const { search, status, customerId, page = '1', limit = '10' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const take = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 10));
    const skip = (pageNum - 1) * take;

    const where: any = {};

    if (status && typeof status === 'string' && status !== 'ALL') {
      where.status = status;
    }

    if (customerId && typeof customerId === 'string') {
      where.customerId = customerId;
    }

    if (search && typeof search === 'string') {
      const q = search.trim();
      where.OR = [
        { challanNumber: { contains: q } },
        { customer: { name: { contains: q } } },
        { customer: { businessName: { contains: q } } },
      ];
    }

    const [totalCount, challans] = await Promise.all([
      prisma.challan.count({ where }),
      prisma.challan.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              businessName: true,
              email: true,
              mobileNumber: true,
              gstNumber: true,
            },
          },
          items: true,
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              status: true,
            },
          },
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        challans,
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

export async function getChallanById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const challan = await prisma.challan.findUnique({
      where: { id },
      include: {
        customer: true,
        items: true,
        invoice: true,
      },
    });

    if (!challan) {
      throw new AppError('Sales Challan not found', 404);
    }

    return res.status(200).json({
      success: true,
      data: challan,
    });
  } catch (error) {
    next(error);
  }
}

export async function createChallan(req: Request, res: Response, next: NextFunction) {
  try {
    const { customerId, status = 'Draft', notes, items } = req.body;

    // Verify Customer exists
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      throw new AppError('Selected customer not found', 404);
    }

    // Fetch product details for snapshot and stock checks
    const productIds = items.map((i: any) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== items.length) {
      throw new AppError('One or more selected products were not found', 404);
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Check stock availability if status is Confirmed
    if (status === 'Confirmed') {
      for (const item of items) {
        const p = productMap.get(item.productId)!;
        if (p.currentStock < item.quantity) {
          throw new AppError(
            `Insufficient stock for '${p.name}' (${p.sku}). Requested: ${item.quantity}, Available: ${p.currentStock}. Cannot confirm challan.`,
            400
          );
        }
      }
    }

    // Auto-generate unique Challan number
    const challanNumber = await generateChallanNumber();

    // Prepare snapshot items & totals
    let totalQuantity = 0;
    let totalAmount = 0;
    const snapshotItems = items.map((item: any) => {
      const p = productMap.get(item.productId)!;
      const subtotal = p.unitPrice * item.quantity;
      totalQuantity += item.quantity;
      totalAmount += subtotal;

      return {
        productId: p.id,
        productNameSnapshot: p.name,
        skuSnapshot: p.sku,
        unitPriceSnapshot: p.unitPrice,
        quantity: item.quantity,
        subtotal,
      };
    });

    // Execute atomic transaction
    const challan = await prisma.$transaction(async (tx) => {
      // 1. If confirmed, reduce stock and record OUT movement
      if (status === 'Confirmed') {
        for (const item of items) {
          const p = productMap.get(item.productId)!;
          const updatedStock = p.currentStock - item.quantity;

          if (updatedStock < 0) {
            throw new AppError(
              `Stock conflict detected for '${p.name}'. Stock cannot go negative.`,
              400
            );
          }

          // Decrement stock
          await tx.product.update({
            where: { id: p.id },
            data: { currentStock: updatedStock },
          });

          // Record stock movement log
          await tx.stockMovement.create({
            data: {
              productId: p.id,
              quantityChanged: item.quantity,
              movementType: 'OUT',
              reason: `Sales Challan Confirmation: ${challanNumber}`,
              createdById: req.user?.id || null,
              createdByName: req.user?.name || 'Sales User',
            },
          });
        }
      }

      // 2. Create Challan and its Snapshot items
      const createdChallan = await tx.challan.create({
        data: {
          challanNumber,
          customerId,
          totalQuantity,
          totalAmount,
          status,
          createdById: req.user?.id || null,
          createdByName: req.user?.name || 'Sales User',
          notes: notes || null,
          items: {
            create: snapshotItems,
          },
        },
        include: {
          customer: true,
          items: true,
        },
      });

      return createdChallan;
    });

    return res.status(201).json({
      success: true,
      message: `Sales Challan ${challan.challanNumber} created as ${status}`,
      data: challan,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateChallanStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { status: targetStatus } = req.body;

    const challan = await prisma.challan.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!challan) {
      throw new AppError('Challan not found', 404);
    }

    if (challan.status === targetStatus) {
      return res.status(200).json({
        success: true,
        message: `Challan is already ${targetStatus}`,
        data: challan,
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Transition: Draft -> Confirmed
      if (challan.status === 'Draft' && targetStatus === 'Confirmed') {
        for (const item of challan.items) {
          if (!item.productId) continue;

          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (!product) {
            throw new AppError(`Original product '${item.productNameSnapshot}' not found in inventory`, 404);
          }

          if (product.currentStock < item.quantity) {
            throw new AppError(
              `Insufficient stock for '${product.name}'. Required: ${item.quantity}, In Stock: ${product.currentStock}. Cannot confirm challan.`,
              400
            );
          }

          // Decrement stock
          await tx.product.update({
            where: { id: product.id },
            data: { currentStock: product.currentStock - item.quantity },
          });

          // Record stock movement
          await tx.stockMovement.create({
            data: {
              productId: product.id,
              quantityChanged: item.quantity,
              movementType: 'OUT',
              reason: `Sales Challan Confirmation: ${challan.challanNumber}`,
              referenceId: challan.id,
              createdById: req.user?.id || null,
              createdByName: req.user?.name || 'System User',
            },
          });
        }
      }

      // Transition: Confirmed -> Cancelled (Restore stock)
      if (challan.status === 'Confirmed' && targetStatus === 'Cancelled') {
        for (const item of challan.items) {
          if (!item.productId) continue;

          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (product) {
            await tx.product.update({
              where: { id: product.id },
              data: { currentStock: product.currentStock + item.quantity },
            });

            await tx.stockMovement.create({
              data: {
                productId: product.id,
                quantityChanged: item.quantity,
                movementType: 'IN',
                reason: `Challan Cancellation Restock: ${challan.challanNumber}`,
                referenceId: challan.id,
                createdById: req.user?.id || null,
                createdByName: req.user?.name || 'System User',
              },
            });
          }
        }
      }

      const result = await tx.challan.update({
        where: { id },
        data: { status: targetStatus },
        include: {
          customer: true,
          items: true,
          invoice: true,
        },
      });

      return result;
    });

    return res.status(200).json({
      success: true,
      message: `Challan status updated to ${targetStatus}`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}