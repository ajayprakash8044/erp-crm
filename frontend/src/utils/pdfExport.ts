import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Challan, Invoice } from '../types';
import { formatCurrency, formatDate } from './formatters';

export function exportChallanPDF(challan: Challan) {
  const doc = new jsPDF();

  // Company Header
  doc.setFontSize(18);
  doc.setTextColor(30, 64, 175); // primary-800
  doc.text('MINI ERP & CRM DISTRIBUTION PVT LTD', 14, 20);

  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text('Industrial Logistics Park, Sector 62, Warehouse Hub', 14, 26);
  doc.text('GSTIN: 27AABCM9988D1Z4 | Email: operations@minierp.com | Phone: +91 1800 123 4567', 14, 31);

  // Line separator
  doc.setDrawColor(200);
  doc.setLineWidth(0.5);
  doc.line(14, 35, 196, 35);

  // Document Title
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('SALES DELIVERY CHALLAN', 14, 43);

  // Challan & Customer Meta
  doc.setFontSize(10);
  doc.setTextColor(70);
  
  // Left: Customer details
  doc.setFont('helvetica', 'bold');
  doc.text('Consignee / Customer Details:', 14, 52);
  doc.setFont('helvetica', 'normal');
  doc.text(`Business Name: ${challan.customer?.businessName || challan.customer?.name}`, 14, 58);
  doc.text(`Contact Person: ${challan.customer?.name}`, 14, 64);
  doc.text(`Mobile: ${challan.customer?.mobileNumber}`, 14, 70);
  doc.text(`GST Number: ${challan.customer?.gstNumber || 'Unregistered'}`, 14, 76);
  doc.text(`Address: ${challan.customer?.address || 'N/A'}`, 14, 82);

  // Right: Challan info
  doc.setFont('helvetica', 'bold');
  doc.text('Challan Information:', 125, 52);
  doc.setFont('helvetica', 'normal');
  doc.text(`Challan No: ${challan.challanNumber}`, 125, 58);
  doc.text(`Date: ${formatDate(challan.createdAt)}`, 125, 64);
  doc.text(`Status: ${challan.status.toUpperCase()}`, 125, 70);
  doc.text(`Prepared By: ${challan.createdByName}`, 125, 76);

  // Table of Items
  const tableData = challan.items.map((item, index) => [
    index + 1,
    item.productNameSnapshot,
    item.skuSnapshot,
    formatCurrency(item.unitPriceSnapshot),
    item.quantity,
    formatCurrency(item.subtotal),
  ]);

  autoTable(doc, {
    startY: 92,
    head: [['#', 'Item Description', 'SKU', 'Unit Price', 'Quantity', 'Subtotal']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [37, 99, 235], // primary blue
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 9,
      cellPadding: 4,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 70 },
      2: { cellWidth: 28 },
      3: { cellWidth: 26, halign: 'right' },
      4: { cellWidth: 20, halign: 'center' },
      5: { cellWidth: 32, halign: 'right' },
    },
  });

  // Summary Totals
  const finalY = (doc as any).lastAutoTable.finalY + 10;

  doc.setFont('helvetica', 'bold');
  doc.text(`Total Units Dispatched: ${challan.totalQuantity}`, 125, finalY);
  doc.text(`Total Amount: ${formatCurrency(challan.totalAmount)}`, 125, finalY + 6);

  // Footer notes & signatures
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text('Terms & Conditions:', 14, finalY + 20);
  doc.text('1. Goods once delivered and verified cannot be returned without prior authorization.', 14, finalY + 25);
  doc.text('2. Please inspect all packages and carton seals upon delivery.', 14, finalY + 30);

  doc.setTextColor(60);
  doc.setFont('helvetica', 'bold');
  doc.text('Authorized Signatory', 145, finalY + 45);
  doc.text('Receiver\'s Signature & Stamp', 14, finalY + 45);

  doc.save(`Challan_${challan.challanNumber}.pdf`);
}

export function exportInvoicePDF(invoice: Invoice) {
  const doc = new jsPDF();

  // Company Header
  doc.setFontSize(20);
  doc.setTextColor(30, 64, 175);
  doc.text('TAX INVOICE', 14, 20);

  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text('MINI ERP & CRM DISTRIBUTION PVT LTD', 14, 27);
  doc.text('Industrial Logistics Park, Sector 62, Warehouse Hub | GSTIN: 27AABCM9988D1Z4', 14, 32);

  doc.setDrawColor(200);
  doc.setLineWidth(0.5);
  doc.line(14, 36, 196, 36);

  // Invoice & Customer Info
  doc.setFontSize(10);
  doc.setTextColor(70);

  // Left side: Bill To
  doc.setFont('helvetica', 'bold');
  doc.text('Billed To:', 14, 44);
  doc.setFont('helvetica', 'normal');
  doc.text(`Customer: ${invoice.customer.businessName || invoice.customer.name}`, 14, 50);
  doc.text(`Contact: ${invoice.customer.name} (${invoice.customer.mobileNumber})`, 14, 56);
  doc.text(`GSTIN: ${invoice.customer.gstNumber || 'Unregistered'}`, 14, 62);
  doc.text(`Billing Address: ${invoice.customer.address || 'N/A'}`, 14, 68);

  // Right side: Invoice Meta
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice Details:', 130, 44);
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice No: ${invoice.invoiceNumber}`, 130, 50);
  doc.text(`Date: ${formatDate(invoice.createdAt)}`, 130, 56);
  doc.text(`Delivery Challan: ${invoice.challan?.challanNumber || 'N/A'}`, 130, 62);
  doc.text(`Due Date: ${formatDate(invoice.dueDate)}`, 130, 68);
  doc.text(`Payment Status: ${invoice.status.toUpperCase()}`, 130, 74);

  // Items Table
  const tableData = invoice.challan.items.map((item, index) => [
    index + 1,
    item.productNameSnapshot,
    item.skuSnapshot,
    item.quantity,
    formatCurrency(item.unitPriceSnapshot),
    formatCurrency(item.subtotal),
  ]);

  autoTable(doc, {
    startY: 82,
    head: [['#', 'Item Description', 'SKU', 'Qty', 'Unit Price', 'Total']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 64, 175],
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 9,
      cellPadding: 4,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 75 },
      2: { cellWidth: 25 },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 33, halign: 'right' },
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;

  // Tax Breakdown
  doc.setFontSize(9);
  doc.text(`Taxable Subtotal:`, 125, finalY);
  doc.text(formatCurrency(invoice.subtotal), 195, finalY, { align: 'right' });

  doc.text(`GST (${invoice.taxRate}%):`, 125, finalY + 6);
  doc.text(formatCurrency(invoice.taxAmount), 195, finalY + 6, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 64, 175);
  doc.text(`Grand Total:`, 125, finalY + 14);
  doc.text(formatCurrency(invoice.grandTotal), 195, finalY + 14, { align: 'right' });

  // Bank transfer info & signature
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text('Bank Transfer Details for Payment:', 14, finalY + 10);
  doc.text('Bank: HDFC Bank | A/C: 50200012345678 | IFSC: HDFC0000123', 14, finalY + 15);
  doc.text('Branch: Sector 62 Commercial Complex', 14, finalY + 20);

  doc.setTextColor(60);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('For MINI ERP & CRM DISTRIBUTION PVT LTD', 130, finalY + 36);
  doc.text('Authorized Signatory', 145, finalY + 50);

  doc.save(`Invoice_${invoice.invoiceNumber}.pdf`);
}