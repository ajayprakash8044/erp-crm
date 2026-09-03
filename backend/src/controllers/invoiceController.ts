import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { generateInvoiceNumber } from '../utils/generateNumber';
import { AppError } from '../middleware/errorHandler';

export const createInvoiceSchema = z.object({
  taxRate: z.number().min(0).default(18.0),
  dueDate: z.string().optional(),
  notes: z.string().optional().nullable(),
});

export const updateInvoiceStatusSchema = z.object({
  status: z.enum(['Unpaid', 'Paid', 'Cancelled']),
});

export async function getInvoices(req: Request, res: Response, next: NextFunction) {
  try {
    const { search, status, page = '1', limit = '10' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const take = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 10));
    const skip = (pageNum - 1) * take;

    const where: any = {};
    if (status && typeof status === 'string' && status !== 'ALL') {
      where.status = status;
    }

    if (search && typeof search === 'string') {
      const q = search.trim();
      where.OR = [
        { invoiceNumber: { contains: q } },
        { customer: { name: { contains: q } } },
        { customer: { businessName: { contains: q } } },
        { challan: { challanNumber: { contains: q } } },
      ];
    }

    const [totalCount, invoices] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
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
              address: true,
            },
          },
          challan: {
            include: {
              items: true,
            },
          },
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        invoices,
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

export async function getInvoiceById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        challan: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    return res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
}

export async function createInvoiceFromChallan(req: Request, res: Response, next: NextFunction) {
  try {
    const { challanId } = req.params;
    const { taxRate = 18.0, dueDate, notes } = req.body;

    const challan = await prisma.challan.findUnique({
      where: { id: challanId },
      include: {
        items: true,
        customer: true,
        invoice: true,
      },
    });

    if (!challan) {
      throw new AppError('Challan not found', 404);
    }

    if (challan.status !== 'Confirmed') {
      throw new AppError('Invoices can only be generated for Confirmed Challans', 400);
    }

    if (challan.invoice) {
      throw new AppError(`Invoice ${challan.invoice.invoiceNumber} already exists for this Challan`, 409);
    }

    const subtotal = challan.totalAmount;
    const taxAmount = (subtotal * taxRate) / 100;
    const grandTotal = subtotal + taxAmount;
    const invoiceNumber = await generateInvoiceNumber();

    const invoiceDueDate = dueDate ? new Date(dueDate) : new Date(Date.now() + 86400000 * 30);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        challanId: challan.id,
        customerId: challan.customerId,
        subtotal,
        taxRate,
        taxAmount,
        grandTotal,
        status: 'Unpaid',
        dueDate: invoiceDueDate,
        notes: notes || `Generated from Delivery Challan ${challan.challanNumber}`,
      },
      include: {
        customer: true,
        challan: {
          include: {
            items: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: `Invoice ${invoiceNumber} generated successfully`,
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateInvoiceStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: { status },
      include: {
        customer: true,
        challan: {
          include: { items: true },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: `Invoice status updated to ${status}`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}