import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Mini ERP + CRM database...');

  // 1. Clean existing records
  await prisma.invoice.deleteMany();
  await prisma.challanItem.deleteMany();
  await prisma.challan.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customerFollowUp.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();

  // 2. Seed Users
  const passwordHash = await bcrypt.hash('admin123', 10);
  const salesPasswordHash = await bcrypt.hash('sales123', 10);
  const warehousePasswordHash = await bcrypt.hash('warehouse123', 10);
  const accountsPasswordHash = await bcrypt.hash('accounts123', 10);

  const adminUser = await prisma.user.create({
    data: {
      name: 'Dev Admin',
      email: 'admin@minierp.com',
      passwordHash,
      role: 'ADMIN',
    },
  });

  const salesUser = await prisma.user.create({
    data: {
      name: 'Sarah Sales',
      email: 'sales@minierp.com',
      passwordHash: salesPasswordHash,
      role: 'SALES',
    },
  });

  const warehouseUser = await prisma.user.create({
    data: {
      name: 'Wayne Warehouse',
      email: 'warehouse@minierp.com',
      passwordHash: warehousePasswordHash,
      role: 'WAREHOUSE',
    },
  });

  const accountsUser = await prisma.user.create({
    data: {
      name: 'Alice Accounts',
      email: 'accounts@minierp.com',
      passwordHash: accountsPasswordHash,
      role: 'ACCOUNTS',
    },
  });

  console.log('Seeded users for all 4 roles: ADMIN, SALES, WAREHOUSE, ACCOUNTS');

  // 3. Seed Customers
  const customer1 = await prisma.customer.create({
    data: {
      name: 'Rajesh Kumar',
      mobileNumber: '+91 98765 43210',
      email: 'rajesh@apexretail.in',
      businessName: 'Apex Retailers Pvt Ltd',
      gstNumber: '27AAACA1234A1Z5',
      customerType: 'Retail',
      address: 'Shop 12-14, Commercial Plaza, Bandra West, Mumbai 400050',
      status: 'Active',
      followUpDate: new Date(Date.now() + 86400000 * 3), // 3 days from now
      notes: 'Key client for packaging supplies and retail point of sale scanners.',
      followUps: {
        create: [
          {
            note: 'Discussed quarterly bulk order discount for shipping boxes.',
            createdByName: salesUser.name,
            createdById: salesUser.id,
          },
          {
            note: 'Customer requested thermal paper rolls sample.',
            createdByName: salesUser.name,
            createdById: salesUser.id,
          },
        ],
      },
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      name: 'Sunil Sharma',
      mobileNumber: '+91 98111 22334',
      email: 'orders@bharatwholesale.com',
      businessName: 'Bharat Wholesale Mart',
      gstNumber: '07AABCB5678B1Z2',
      customerType: 'Wholesale',
      address: 'Plot 45, Okhla Industrial Area Phase 2, New Delhi 110020',
      status: 'Active',
      followUpDate: new Date(Date.now() + 86400000 * 1),
      notes: 'Wholesale client ordering regular electronics and pallet gear.',
      followUps: {
        create: [
          {
            note: 'Initial contract signed with standard 30-day payment term.',
            createdByName: adminUser.name,
            createdById: adminUser.id,
          },
        ],
      },
    },
  });

  const customer3 = await prisma.customer.create({
    data: {
      name: 'Kavita Patel',
      mobileNumber: '+91 99090 12345',
      email: 'kavita@citylogistics.net',
      businessName: 'City Logistics & Distribution',
      gstNumber: '24AACCB9012C1Z8',
      customerType: 'Distributor',
      address: 'Warehouse Hub 8, GIDC Industrial Estate, Ahmedabad 382445',
      status: 'Active',
      followUpDate: new Date(Date.now() + 86400000 * 5),
      notes: 'Regional logistics partner and bulk distributor.',
    },
  });

  const customer4 = await prisma.customer.create({
    data: {
      name: 'Anand Reddy',
      mobileNumber: '+91 94400 98765',
      email: 'anand@deccanelec.com',
      businessName: 'Deccan Electronics Store',
      gstNumber: '36AADEB7890E1Z1',
      customerType: 'Retail',
      address: '5-9-102, Gunfoundry, Abids, Hyderabad 500001',
      status: 'Lead',
      followUpDate: new Date(Date.now() + 86400000 * 2),
      notes: 'Prospective buyer for RFID scanners and barcode equipment.',
      followUps: {
        create: [
          {
            note: 'Lead generated from industrial trade fair. Sent product catalog.',
            createdByName: salesUser.name,
            createdById: salesUser.id,
          },
        ],
      },
    },
  });

  const customer5 = await prisma.customer.create({
    data: {
      name: 'Vikram Joshi',
      mobileNumber: '+91 98200 44556',
      email: 'vikram@metrotraders.org',
      businessName: 'Metro Trading House',
      gstNumber: '27AAGCM1122F1Z9',
      customerType: 'Wholesale',
      address: '24 Crawford Market, Fort, Mumbai 400001',
      status: 'Inactive',
      notes: 'Account paused due to business restructuring.',
    },
  });

  console.log('Seeded 5 customers with CRM follow-ups');

  // 4. Seed Products
  const p1 = await prisma.product.create({
    data: {
      name: 'Industrial Barcode Scanner 2D',
      sku: 'SCN-001',
      category: 'Electronics',
      unitPrice: 3500,
      currentStock: 45,
      minStockAlert: 15,
      location: 'Bay A-01',
    },
  });

  const p2 = await prisma.product.create({
    data: {
      name: 'Thermal Receipt Printer 80mm',
      sku: 'PRN-002',
      category: 'Electronics',
      unitPrice: 5200,
      currentStock: 22,
      minStockAlert: 10,
      location: 'Bay A-02',
    },
  });

  const p3 = await prisma.product.create({
    data: {
      name: 'Heavy Duty Packing Tape (Box of 36)',
      sku: 'PKG-003',
      category: 'Packaging',
      unitPrice: 1200,
      currentStock: 8, // BELOW MIN ALERT (8 <= 20)
      minStockAlert: 20,
      location: 'Aisle B-04',
    },
  });

  const p4 = await prisma.product.create({
    data: {
      name: 'Corrugated Shipping Boxes 12x10x8 (Bundle 50)',
      sku: 'PKG-004',
      category: 'Packaging',
      unitPrice: 1800,
      currentStock: 5, // BELOW MIN ALERT (5 <= 25)
      minStockAlert: 25,
      location: 'Pallet C-01',
    },
  });

  const p5 = await prisma.product.create({
    data: {
      name: 'Digital Weighing Platform Scale 50kg',
      sku: 'SCL-005',
      category: 'Hardware',
      unitPrice: 4200,
      currentStock: 14,
      minStockAlert: 5,
      location: 'Bay B-02',
    },
  });

  const p6 = await prisma.product.create({
    data: {
      name: 'Hydraulic Pallet Truck 2.5 Ton',
      sku: 'PLT-006',
      category: 'Hardware',
      unitPrice: 18500,
      currentStock: 3,
      minStockAlert: 2,
      location: 'Floor D-01',
    },
  });

  const p7 = await prisma.product.create({
    data: {
      name: 'Handheld Long-Range RFID Reader',
      sku: 'RFD-007',
      category: 'Electronics',
      unitPrice: 8900,
      currentStock: 12,
      minStockAlert: 5,
      location: 'Bay A-03',
    },
  });

  const p8 = await prisma.product.create({
    data: {
      name: 'Stretch Wrap Film 500mm Roll',
      sku: 'PKG-008',
      category: 'Packaging',
      unitPrice: 650,
      currentStock: 60,
      minStockAlert: 15,
      location: 'Aisle B-05',
    },
  });

  console.log('Seeded 8 products across Electronics, Hardware, Packaging');

  // 5. Seed Stock Movements for audit log
  await prisma.stockMovement.createMany({
    data: [
      {
        productId: p1.id,
        quantityChanged: 50,
        movementType: 'IN',
        reason: 'Initial Inward PO-2026-01',
        createdById: warehouseUser.id,
        createdByName: warehouseUser.name,
      },
      {
        productId: p1.id,
        quantityChanged: 5,
        movementType: 'OUT',
        reason: 'Quality testing & display samples',
        createdById: warehouseUser.id,
        createdByName: warehouseUser.name,
      },
      {
        productId: p3.id,
        quantityChanged: 20,
        movementType: 'IN',
        reason: 'Vendor Delivery Batch 84',
        createdById: warehouseUser.id,
        createdByName: warehouseUser.name,
      },
      {
        productId: p3.id,
        quantityChanged: 12,
        movementType: 'OUT',
        reason: 'Warehouse consumption & packaging operations',
        createdById: warehouseUser.id,
        createdByName: warehouseUser.name,
      },
    ],
  });

  // 6. Seed a Confirmed Challan (with snapshot items) and Invoice
  const confirmedChallan = await prisma.challan.create({
    data: {
      challanNumber: 'CH-2026-0001',
      customerId: customer1.id,
      totalQuantity: 7,
      totalAmount: 2*3500 + 5*1200, // 7000 + 6000 = 13000
      status: 'Confirmed',
      createdById: salesUser.id,
      createdByName: salesUser.name,
      notes: 'Urgent delivery for retail store upgrade.',
      items: {
        create: [
          {
            productId: p1.id,
            productNameSnapshot: p1.name,
            skuSnapshot: p1.sku,
            unitPriceSnapshot: p1.unitPrice,
            quantity: 2,
            subtotal: 7000,
          },
          {
            productId: p3.id,
            productNameSnapshot: p3.name,
            skuSnapshot: p3.sku,
            unitPriceSnapshot: p3.unitPrice,
            quantity: 5,
            subtotal: 6000,
          },
        ],
      },
    },
  });

  // Log stock movement for the confirmed challan
  await prisma.stockMovement.createMany({
    data: [
      {
        productId: p1.id,
        quantityChanged: 2,
        movementType: 'OUT',
        reason: 'Challan Confirmation: CH-2026-0001',
        referenceId: confirmedChallan.id,
        createdById: salesUser.id,
        createdByName: salesUser.name,
      },
      {
        productId: p3.id,
        quantityChanged: 5,
        movementType: 'OUT',
        reason: 'Challan Confirmation: CH-2026-0001',
        referenceId: confirmedChallan.id,
        createdById: salesUser.id,
        createdByName: salesUser.name,
      },
    ],
  });

  // Create corresponding invoice for the confirmed challan
  const subtotal = 13000;
  const taxAmount = subtotal * 0.18;
  const grandTotal = subtotal + taxAmount;

  await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2026-0001',
      challanId: confirmedChallan.id,
      customerId: customer1.id,
      subtotal,
      taxRate: 18.0,
      taxAmount,
      grandTotal,
      status: 'Paid',
      dueDate: new Date(Date.now() + 86400000 * 30),
      notes: 'Payment received in full via NEFT on invoice presentation.',
    },
  });

  // 7. Seed a Draft Challan
  await prisma.challan.create({
    data: {
      challanNumber: 'CH-2026-0002',
      customerId: customer2.id,
      totalQuantity: 3,
      totalAmount: 1*18500 + 2*5200, // 18500 + 10400 = 28900
      status: 'Draft',
      createdById: salesUser.id,
      createdByName: salesUser.name,
      notes: 'Awaiting dispatch confirmation from customer warehouse manager.',
      items: {
        create: [
          {
            productId: p6.id,
            productNameSnapshot: p6.name,
            skuSnapshot: p6.sku,
            unitPriceSnapshot: p6.unitPrice,
            quantity: 1,
            subtotal: 18500,
          },
          {
            productId: p2.id,
            productNameSnapshot: p2.name,
            skuSnapshot: p2.sku,
            unitPriceSnapshot: p2.unitPrice,
            quantity: 2,
            subtotal: 10400,
          },
        ],
      },
    },
  });

  console.log('Seeded sample Challans (Draft and Confirmed) and Invoices');
  console.log('Database seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });