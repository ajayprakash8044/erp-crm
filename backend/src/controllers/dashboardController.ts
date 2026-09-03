import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';

export async function getDashboardStats(req: Request, res: Response, next: NextFunction) {
  try {
    // 1. Customer metrics
    const [totalCustomers, activeCustomers, leadCustomers] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({ where: { status: 'Active' } }),
      prisma.customer.count({ where: { status: 'Lead' } }),
    ]);

    // 2. Product & Inventory metrics
    const products = await prisma.product.findMany();
    const totalProducts = products.length;
    let totalStockUnits = 0;
    let totalInventoryValue = 0;
    let lowStockCount = 0;
    const lowStockItems: any[] = [];

    for (const p of products) {
      totalStockUnits += p.currentStock;
      totalInventoryValue += p.currentStock * p.unitPrice;
      if (p.currentStock <= p.minStockAlert) {
        lowStockCount += 1;
        lowStockItems.push({
          id: p.id,
          name: p.name,
          sku: p.sku,
          category: p.category,
          currentStock: p.currentStock,
          minStockAlert: p.minStockAlert,
          location: p.location,
        });
      }
    }

    // 3. Challan metrics
    const [totalChallans, draftChallans, confirmedChallans] = await Promise.all([
      prisma.challan.count(),
      prisma.challan.count({ where: { status: 'Draft' } }),
      prisma.challan.count({ where: { status: 'Confirmed' } }),
    ]);

    // 4. Invoicing metrics
    const invoices = await prisma.invoice.findMany();
    let totalInvoicedAmount = 0;
    let totalPaidAmount = 0;
    let totalUnpaidAmount = 0;

    for (const inv of invoices) {
      totalInvoicedAmount += inv.grandTotal;
      if (inv.status === 'Paid') {
        totalPaidAmount += inv.grandTotal;
      } else if (inv.status === 'Unpaid') {
        totalUnpaidAmount += inv.grandTotal;
      }
    }

    // 5. Recent Activity
    const [recentChallans, recentMovements] = await Promise.all([
      prisma.challan.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: { name: true, businessName: true },
          },
        },
      }),
      prisma.stockMovement.findMany({
        take: 5,
        orderBy: { timestamp: 'desc' },
        include: {
          product: {
            select: { name: true, sku: true },
          },
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        customers: {
          total: totalCustomers,
          active: activeCustomers,
          leads: leadCustomers,
        },
        inventory: {
          totalProducts,
          totalStockUnits,
          totalInventoryValue,
          lowStockCount,
          lowStockItems,
        },
        challans: {
          total: totalChallans,
          draft: draftChallans,
          confirmed: confirmedChallans,
        },
        financials: {
          totalInvoices: invoices.length,
          totalInvoicedAmount,
          totalPaidAmount,
          totalUnpaidAmount,
        },
        recentChallans,
        recentMovements,
      },
    });
  } catch (error) {
    next(error);
  }
}