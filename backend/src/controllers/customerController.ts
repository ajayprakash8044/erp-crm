import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

export const customerSchema = z.object({
  name: z.string().min(2, 'Customer name must be at least 2 characters'),
  mobileNumber: z.string().min(7, 'Valid mobile number is required'),
  email: z.string().email('Valid email address is required'),
  businessName: z.string().min(2, 'Business name is required'),
  gstNumber: z.string().optional().nullable(),
  customerType: z.enum(['Retail', 'Wholesale', 'Distributor']),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  status: z.enum(['Lead', 'Active', 'Inactive']).default('Lead'),
  followUpDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const followUpSchema = z.object({
  note: z.string().min(3, 'Follow-up note cannot be empty'),
});

export async function getCustomers(req: Request, res: Response, next: NextFunction) {
  try {
    const { search, status, customerType, page = '1', limit = '10' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const take = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 10));
    const skip = (pageNum - 1) * take;

    const where: any = {};

    if (status && typeof status === 'string' && status !== 'ALL') {
      where.status = status;
    }

    if (customerType && typeof customerType === 'string' && customerType !== 'ALL') {
      where.customerType = customerType;
    }

    if (search && typeof search === 'string') {
      const q = search.trim();
      where.OR = [
        { name: { contains: q } },
        { businessName: { contains: q } },
        { email: { contains: q } },
        { mobileNumber: { contains: q } },
        { gstNumber: { contains: q } },
      ];
    }

    const [totalCount, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: {
            select: { followUps: true, challans: true },
          },
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        customers,
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

export async function getCustomerById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        followUps: {
          orderBy: { createdAt: 'desc' },
        },
        challans: {
          orderBy: { createdAt: 'desc' },
          include: {
            items: true,
          },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    return res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
}

export async function createCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const data = req.body;
    const followUpDate = data.followUpDate ? new Date(data.followUpDate) : null;

    const newCustomer = await prisma.customer.create({
      data: {
        name: data.name,
        mobileNumber: data.mobileNumber,
        email: data.email.toLowerCase(),
        businessName: data.businessName,
        gstNumber: data.gstNumber || null,
        customerType: data.customerType,
        address: data.address,
        status: data.status || 'Lead',
        followUpDate,
        notes: data.notes || null,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: newCustomer,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const data = req.body;

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Customer not found', 404);
    }

    const followUpDate = data.followUpDate !== undefined
      ? (data.followUpDate ? new Date(data.followUpDate) : null)
      : existing.followUpDate;

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        name: data.name ?? existing.name,
        mobileNumber: data.mobileNumber ?? existing.mobileNumber,
        email: data.email ? data.email.toLowerCase() : existing.email,
        businessName: data.businessName ?? existing.businessName,
        gstNumber: data.gstNumber !== undefined ? data.gstNumber : existing.gstNumber,
        customerType: data.customerType ?? existing.customerType,
        address: data.address ?? existing.address,
        status: data.status ?? existing.status,
        followUpDate,
        notes: data.notes !== undefined ? data.notes : existing.notes,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Customer updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function addFollowUpNote(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { note } = req.body;

    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    const followUp = await prisma.customerFollowUp.create({
      data: {
        customerId: id,
        note,
        createdById: req.user?.id || null,
        createdByName: req.user?.name || 'System User',
      },
    });

    // Touch customer's updatedAt
    await prisma.customer.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    return res.status(201).json({
      success: true,
      message: 'Follow-up note added',
      data: followUp,
    });
  } catch (error) {
    next(error);
  }
}