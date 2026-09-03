# Mini ERP + CRM Operations Portal

> **Case Study Project**: Wholesale & Distribution Operations Management System  
> Built with **Node.js, TypeScript, Express.js, Prisma ORM, React 18, Vite, and Tailwind CSS**.

---

## 1. Project Overview & Business Context

This application is a full-stack Mini ERP and CRM Operations Portal designed for a wholesale and distribution business. It streamlines operations across four core internal teams: **Sales, Warehouse, Accounts, and Administration**.

### Key Real-World Business Capabilities:
- **Role-Based Access Control (RBAC)**: Distinct permissions for `Admin`, `Sales`, `Warehouse`, and `Accounts`.
- **Customer CRM**: Complete customer directory, GST tracking, customer classification (`Retail`, `Wholesale`, `Distributor`), status pipeline (`Lead`, `Active`, `Inactive`), and chronological follow-up timeline notes.
- **Product & Inventory Management**: Centralized product catalog, threshold alerts (`currentStock <= minStockAlert`), and an immutable **Stock Movement Audit Log** tracking every IN/OUT transaction with user attribution and reason.
- **Sales Delivery Challan Flow**: Auto-generating sequence numbering (`CH-2026-0001`), immutable product snapshot preservation (product name, SKU, and unit price captured at creation), and atomic stock deduction logic ensuring **stock never goes negative**.
- **Invoices & Billing with PDF Export**: Generate GST-compliant invoices from confirmed delivery challans and download official, formatted PDF documents for delivery challans and tax invoices.

---
git init

## 2. Test Login Credentials

Pre-seeded user accounts are ready for instant evaluation:

| Role | Email | Password | Access / Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@minierp.com` | `admin123` | Full access across all modules, user administration, overrides |
| **Sales** | `sales@minierp.com` | `sales123` | Customer CRM, follow-up notes, create/confirm Sales Challans |
| **Warehouse** | `warehouse@minierp.com` | `warehouse123` | Inventory catalog, low stock alerts, manual IN/OUT stock adjustments |
| **Accounts** | `accounts@minierp.com` | `accounts123` | Invoices, GST breakdown, payment status tracking, PDF invoices |

> **Evaluator Tip**: The login page includes a **1-Click Quick Demo Login** section to effortlessly test all 4 roles without manual typing. The top navbar also features an instant **Role Demo Switcher**.

---

## 3. Architecture & Database Design

### Tech Stack:
- **Backend**: Node.js 20, TypeScript, Express.js, Prisma ORM, Zod validation, JWT, Bcrypt, Helmet, CORS.
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide React icons, Axios, jsPDF, jspdf-autotable.
- **Database**:
  - **Local Development**: SQLite (`dev.db`) for zero-friction out-of-the-box local execution.
  - **Production Ready**: PostgreSQL schema (`prisma/schema.postgresql.prisma`) ready for Neon, Supabase, or Render Postgres.
- **DevOps**: Docker, Docker Compose, Nginx reverse proxy, GitHub Actions CI workflow.

### Data Models & Relationships:

```
[User]
  id, name, email, passwordHash, role (ADMIN|SALES|WAREHOUSE|ACCOUNTS)

[Customer]
  id, name, mobileNumber, email, businessName, gstNumber, customerType, address, status, followUpDate, notes
    ├── 1:N ──> [CustomerFollowUp] (id, note, createdByName, createdAt)
    ├── 1:N ──> [Challan]
    └── 1:N ──> [Invoice]

[Product]
  id, name, sku (unique), category, unitPrice, currentStock, minStockAlert, location
    └── 1:N ──> [StockMovement] (quantityChanged, movementType IN/OUT, reason, timestamp)

[Challan]
  id, challanNumber (unique), customerId, totalQuantity, totalAmount, status (Draft|Confirmed|Cancelled)
    ├── 1:N ──> [ChallanItem] (productNameSnapshot, skuSnapshot, unitPriceSnapshot, quantity, subtotal)
    └── 1:1 ──> [Invoice] (taxRate 18%, taxAmount, grandTotal, status Unpaid|Paid|Cancelled)
```

---

## 4. Critical Business Logic Implementation

### A. Atomic Stock Deduction on Sales Challan
When creating or confirming a delivery challan:
1. The API validates all items in a database transaction (`prisma.$transaction`).
2. Checks that each product exists and has `currentStock >= requestedQuantity`.
3. If stock is insufficient, the transaction immediately aborts and returns an `HTTP 400 Bad Request` with a descriptive message detailing the shortfall.
4. If sufficient:
   - Product stock is atomically decremented: `currentStock = currentStock - quantity`.
   - An immutable `StockMovement` audit record is created (`movementType: 'OUT'`, `reason: 'Sales Challan Confirmation: CH-2026-XXXX'`).
5. **Stock never goes negative**.

### B. Product Snapshot Pattern
Prices and product names change over time in retail/wholesale. Each `ChallanItem` preserves:
- `productNameSnapshot`
- `skuSnapshot`
- `unitPriceSnapshot`  
Even if the product's catalog price changes in the future, past delivery challans and invoices retain accurate historic figures.

### C. Reversible Draft & Cancellation
- Saving as **Draft** reserves no physical stock until confirmed.
- Confirming a Draft triggers the atomic check and deduction.
- Cancelling a Confirmed challan safely restores stock and logs an `IN` movement (`'Challan Cancellation Restock'`).

---

## 5. Local Setup & Quickstart

### Prerequisites:
- Node.js 18+ or 20+
- npm 9+

### 1-Command Startup:
From the project root:

```bash
# 1. Install all dependencies (root, backend, frontend)
npm run install:all

# 2. Setup local database and seed test accounts
npm run seed

# 3. Launch both backend (port 5000) and frontend (port 5173) concurrently
npm run dev
```

Open your browser at: **`http://localhost:5173`**

---

## 6. Running Automated Tests

Comprehensive integration tests covering authentication, RBAC, customer CRM, stock inventory, negative stock prevention, and challan business logic:

```bash
npm run test
```

---

## 7. Environment Variables Management

### Backend (`backend/.env`):
```ini
# Server Port
PORT=5000

# SQLite Local Development URL
DATABASE_URL="file:./dev.db"

# Production PostgreSQL Connection (e.g., Neon / Supabase / Render Postgres)
# DATABASE_URL="postgresql://user:pass@ep-hostname.region.aws.neon.tech/minierp?sslmode=require"

# JWT Secret & Expiry
JWT_SECRET="super-secret-mini-erp-crm-jwt-key-2026"
JWT_EXPIRES_IN="1d"

# Allowed CORS Origin
CORS_ORIGIN="http://localhost:5173"
```

---

## 8. Deployment Guide (Free Hosting Platforms)

### Frontend Deployment (Vercel / Netlify / Render):
1. Push project to your GitHub repository.
2. Link repo to **Vercel** or **Netlify**.
3. Set **Root Directory** to `frontend`.
4. Build command: `npm run build`
5. Output directory: `dist`
6. Set environment variable:
   - `VITE_API_URL`: `https://your-backend-service.onrender.com/api`

### Backend Deployment (Render / Railway / Fly.io):
1. Create a **Web Service** on **Render** or **Railway**.
2. Set **Root Directory** to `backend`.
3. Build command: `npm install && npx prisma generate && npm run build`
4. Start command: `node dist/server.js`
5. Set Environment Variables:
   - `DATABASE_URL`: Your PostgreSQL connection string from Neon / Supabase.
   - `JWT_SECRET`: Random 64-character secret.
   - `CORS_ORIGIN`: Your live frontend URL (`https://your-frontend.vercel.app`).

### Database Deployment (Neon / Supabase / Render Postgres):
1. Create a free PostgreSQL database on [Neon.tech](https://neon.tech) or [Supabase](https://supabase.com).
2. Copy the connection string.
3. Switch datasource provider in `backend/prisma/schema.prisma` to `provider = "postgresql"` (or use `backend/prisma/schema.postgresql.prisma`).
4. Run `npx prisma db push && npm run prisma:seed`.

---

## 9. Docker Setup (Bonus Point)

Run PostgreSQL, the backend REST API, and Nginx-served frontend in isolated containers:

```bash
docker-compose up --build
```

- Frontend: `http://localhost`
- Backend API: `http://localhost:5000`
- PostgreSQL: `localhost:5432`

---

## 10. Postman Collection

Import `postman_collection.json` into Postman:
- Includes pre-configured endpoints for Auth, Customers, Products, Stock Movements, Challans, and Invoices.
- Automated token extraction saves the JWT to collection variables upon login.

---

## 11. Assumptions Made & Known Limitations

### Assumptions:
1. Standard wholesale billing in India includes 18% GST by default (configurable per invoice).
2. Challan sequence restarts per calendar year (`CH-YYYY-0001`).
3. Single currency (INR ₹) is utilized for wholesale distribution.

### Known Limitations:
1. Product image upload: Prepared for AWS S3; placeholder icon rendered locally without cloud credentials.
2. Email notification dispatch (SMS/Email triggers) is mocked in logs rather than connecting to live SMTP/Twilio in dev mode.