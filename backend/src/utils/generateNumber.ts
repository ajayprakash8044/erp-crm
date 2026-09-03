import { prisma } from './prisma';

export async function generateChallanNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `CH-${currentYear}-`;

  const latestChallan = await prisma.challan.findFirst({
    where: {
      challanNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      challanNumber: 'desc',
    },
  });

  if (!latestChallan) {
    return `${prefix}0001`;
  }

  const parts = latestChallan.challanNumber.split('-');
  const seq = parseInt(parts[parts.length - 1], 10);
  const nextSeq = isNaN(seq) ? 1 : seq + 1;

  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

export async function generateInvoiceNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `INV-${currentYear}-`;

  const latestInvoice = await prisma.invoice.findFirst({
    where: {
      invoiceNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      invoiceNumber: 'desc',
    },
  });

  if (!latestInvoice) {
    return `${prefix}0001`;
  }

  const parts = latestInvoice.invoiceNumber.split('-');
  const seq = parseInt(parts[parts.length - 1], 10);
  const nextSeq = isNaN(seq) ? 1 : seq + 1;

  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}