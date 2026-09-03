import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/utils/prisma';

let adminToken = '';
let salesToken = '';
let warehouseToken = '';
let accountsToken = '';
let testCustomerId = '';
let testProductId = '';

beforeAll(async () => {
  // Login as admin
  const adminRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@minierp.com', password: 'admin123' });
  expect(adminRes.status).toBe(200);
  adminToken = adminRes.body.data.token;

  // Login as sales
  const salesRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'sales@minierp.com', password: 'sales123' });
  expect(salesRes.status).toBe(200);
  salesToken = salesRes.body.data.token;

  // Login as warehouse
  const warehouseRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'warehouse@minierp.com', password: 'warehouse123' });
  expect(warehouseRes.status).toBe(200);
  warehouseToken = warehouseRes.body.data.token;

  // Login as accounts
  const accountsRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'accounts@minierp.com', password: 'accounts123' });
  expect(accountsRes.status).toBe(200);
  accountsToken = accountsRes.body.data.token;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('1. Authentication & Role-Based Access Control', () => {
  it('should reject invalid login credentials with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@minierp.com', password: 'wrongpassword' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should allow admin to list all users', async () => {
    const res = await request(app)
      .get('/api/auth/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(4);
  });

  it('should deny non-admin users from accessing user list with 403', async () => {
    const res = await request(app)
      .get('/api/auth/users')
      .set('Authorization', `Bearer ${salesToken}`);
    expect(res.status).toBe(403);
  });
});

describe('2. Customer CRM Module', () => {
  it('should allow sales user to create a new customer', async () => {
    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        name: 'Test Customer Alpha',
        mobileNumber: '+91 99999 88888',
        email: 'alpha@testcustomer.com',
        businessName: 'Alpha Trading Corp',
        customerType: 'Wholesale',
        address: 'Sector 18, Gurugram, Haryana',
        status: 'Active',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Test Customer Alpha');
    testCustomerId = res.body.data.id;
  });

  it('should allow adding follow-up notes to a customer', async () => {
    const res = await request(app)
      .post(`/api/customers/${testCustomerId}/notes`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ note: 'Called client regarding product brochure and payment terms.' });

    expect(res.status).toBe(201);
    expect(res.body.data.note).toContain('Called client');
  });

  it('should retrieve customer detail with follow-up timeline', async () => {
    const res = await request(app)
      .get(`/api/customers/${testCustomerId}`)
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.followUps.length).toBeGreaterThanOrEqual(1);
  });
});

describe('3. Products & Stock Inventory Module', () => {
  it('should allow warehouse user to create a product', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        name: 'Test Bluetooth Scanner 3000',
        sku: `TST-${Date.now()}`,
        category: 'Electronics',
        unitPrice: 2500,
        currentStock: 10,
        minStockAlert: 5,
        location: 'Bay Z-99',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.currentStock).toBe(10);
    testProductId = res.body.data.id;
  });

  it('should prevent stock from going negative on manual adjustment', async () => {
    const res = await request(app)
      .post(`/api/products/${testProductId}/stock-movement`)
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        quantity: 999, // exceeds current stock 10
        movementType: 'OUT',
        reason: 'Attempted excessive deduction',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Insufficient stock');
  });

  it('should allow valid inward stock adjustment', async () => {
    const res = await request(app)
      .post(`/api/products/${testProductId}/stock-movement`)
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        quantity: 15,
        movementType: 'IN',
        reason: 'Replenishment batch arrived',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.product.currentStock).toBe(25); // 10 + 15
  });
});

describe('4. Sales Challan Business Logic & Stock Deduction', () => {
  it('should reject Confirmed challan if requested quantity exceeds available stock', async () => {
    const res = await request(app)
      .post('/api/challans')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customerId: testCustomerId,
        status: 'Confirmed',
        items: [
          {
            productId: testProductId,
            quantity: 500, // available is only 25
          },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Insufficient stock');
  });

  it('should create Confirmed challan, deduct stock, and save snapshot data', async () => {
    // Current stock is 25. Order 5.
    const res = await request(app)
      .post('/api/challans')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customerId: testCustomerId,
        status: 'Confirmed',
        notes: 'Priority dispatch',
        items: [
          {
            productId: testProductId,
            quantity: 5,
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('Confirmed');
    expect(res.body.data.totalQuantity).toBe(5);
    expect(res.body.data.items[0].productNameSnapshot).toBe('Test Bluetooth Scanner 3000');
    expect(res.body.data.items[0].unitPriceSnapshot).toBe(2500);

    // Verify product stock was reduced to 20
    const productCheck = await request(app)
      .get(`/api/products/${testProductId}`)
      .set('Authorization', `Bearer ${warehouseToken}`);
    expect(productCheck.body.data.currentStock).toBe(20);
  });

  it('should allow Draft challan without deducting stock until confirmed', async () => {
    // Current stock is 20. Create Draft for 4.
    const draftRes = await request(app)
      .post('/api/challans')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customerId: testCustomerId,
        status: 'Draft',
        items: [
          {
            productId: testProductId,
            quantity: 4,
          },
        ],
      });

    expect(draftRes.status).toBe(201);
    expect(draftRes.body.data.status).toBe('Draft');
    const draftId = draftRes.body.data.id;

    // Stock should still be 20!
    let productCheck = await request(app)
      .get(`/api/products/${testProductId}`)
      .set('Authorization', `Bearer ${warehouseToken}`);
    expect(productCheck.body.data.currentStock).toBe(20);

    // Now confirm the draft challan
    const confirmRes = await request(app)
      .patch(`/api/challans/${draftId}/status`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ status: 'Confirmed' });

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.data.status).toBe('Confirmed');

    // Stock should now be decremented to 16
    productCheck = await request(app)
      .get(`/api/products/${testProductId}`)
      .set('Authorization', `Bearer ${warehouseToken}`);
    expect(productCheck.body.data.currentStock).toBe(16);
  });
});

describe('5. Accounts & Invoicing Flow', () => {
  it('should allow accounts user to generate an invoice from a confirmed challan', async () => {
    // Get confirmed challans
    const challanRes = await request(app)
      .get('/api/challans?status=Confirmed')
      .set('Authorization', `Bearer ${accountsToken}`);
    expect(challanRes.status).toBe(200);

    const targetChallan = challanRes.body.data.challans.find((c: any) => !c.invoice);
    expect(targetChallan).toBeDefined();

    const invoiceRes = await request(app)
      .post(`/api/invoices/from-challan/${targetChallan.id}`)
      .set('Authorization', `Bearer ${accountsToken}`)
      .send({ taxRate: 18.0 });

    expect(invoiceRes.status).toBe(201);
    expect(invoiceRes.body.data.invoiceNumber).toMatch(/^INV-\d{4}-\d{4}$/);
    expect(invoiceRes.body.data.grandTotal).toBeGreaterThan(0);
  });
});