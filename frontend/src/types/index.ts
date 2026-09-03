export type UserRole = 'ADMIN' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTS';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt?: string;
}

export type CustomerType = 'Retail' | 'Wholesale' | 'Distributor';
export type CustomerStatus = 'Lead' | 'Active' | 'Inactive';

export interface CustomerFollowUp {
  id: string;
  customerId: string;
  note: string;
  createdById?: string;
  createdByName: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  mobileNumber: string;
  email: string;
  businessName: string;
  gstNumber?: string | null;
  customerType: CustomerType;
  address: string;
  status: CustomerStatus;
  followUpDate?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  followUps?: CustomerFollowUp[];
  challans?: Challan[];
  invoices?: Invoice[];
  _count?: {
    followUps: number;
    challans: number;
  };
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  unitPrice: number;
  currentStock: number;
  minStockAlert: number;
  location: string;
  isLowStock?: boolean;
  createdAt: string;
  updatedAt: string;
  stockMovements?: StockMovement[];
}

export type MovementType = 'IN' | 'OUT';

export interface StockMovement {
  id: string;
  productId: string;
  product?: {
    id: string;
    name: string;
    sku: string;
    category: string;
  };
  quantityChanged: number;
  movementType: MovementType;
  reason: string;
  referenceId?: string | null;
  createdById?: string | null;
  createdByName: string;
  timestamp: string;
}

export type ChallanStatus = 'Draft' | 'Confirmed' | 'Cancelled';

export interface ChallanItem {
  id: string;
  challanId: string;
  productId?: string | null;
  productNameSnapshot: string;
  skuSnapshot: string;
  unitPriceSnapshot: number;
  quantity: number;
  subtotal: number;
}

export interface Challan {
  id: string;
  challanNumber: string;
  customerId: string;
  customer: {
    id: string;
    name: string;
    businessName: string;
    email: string;
    mobileNumber: string;
    gstNumber?: string | null;
    address?: string;
  };
  totalQuantity: number;
  totalAmount: number;
  status: ChallanStatus;
  createdById?: string | null;
  createdByName: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  items: ChallanItem[];
  invoice?: {
    id: string;
    invoiceNumber: string;
    status: string;
  } | null;
}

export type InvoiceStatus = 'Unpaid' | 'Paid' | 'Cancelled';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  challanId: string;
  challan: Challan;
  customerId: string;
  customer: Customer;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
  status: InvoiceStatus;
  dueDate: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  customers: {
    total: number;
    active: number;
    leads: number;
  };
  inventory: {
    totalProducts: number;
    totalStockUnits: number;
    totalInventoryValue: number;
    lowStockCount: number;
    lowStockItems: Product[];
  };
  challans: {
    total: number;
    draft: number;
    confirmed: number;
  };
  financials: {
    totalInvoices: number;
    totalInvoicedAmount: number;
    totalPaidAmount: number;
    totalUnpaidAmount: number;
  };
  recentChallans: (Challan & { customer: { name: string; businessName: string } })[];
  recentMovements: (StockMovement & { product: { name: string; sku: string } })[];
}