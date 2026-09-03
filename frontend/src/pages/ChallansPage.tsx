import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Challan, Customer, Product, ChallanStatus } from '../types';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/formatters';
import { Modal } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import {
  FileSpreadsheet,
  Search,
  Plus,
  Eye,
  CheckCircle2,
  AlertCircle,
  Building,
  Trash2,
  Package,
  Calendar,
  Filter,
} from 'lucide-react';

interface ChallansPageProps {
  onSelectChallan: (id: string) => void;
}

interface NewItemRow {
  productId: string;
  quantity: number;
}

export const ChallansPage: React.FC<ChallansPageProps> = ({ onSelectChallan }) => {
  const { hasRole } = useAuth();
  const [challans, setChallans] = useState<Challan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Creation modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<NewItemRow[]>([{ productId: '', quantity: 1 }]);
  const [creationError, setCreationError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const fetchChallans = async () => {
    try {
      setLoading(true);
      const res = await api.get('/challans', {
        params: {
          search,
          status: statusFilter,
          limit: 50,
        },
      });
      setChallans(res.data.data.challans);
    } catch (err) {
      console.error('Failed to load challans', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCreationData = async () => {
    try {
      const [custRes, prodRes] = await Promise.all([
        api.get('/customers?limit=100'),
        api.get('/products?limit=100'),
      ]);
      setCustomers(custRes.data.data.customers);
      setProducts(prodRes.data.data.products);
      if (custRes.data.data.customers.length > 0) {
        setSelectedCustomer(custRes.data.data.customers[0].id);
      }
    } catch (err) {
      console.error('Failed to load customers or products', err);
    }
  };

  useEffect(() => {
    fetchChallans();
  }, [search, statusFilter]);

  const openCreateModal = () => {
    loadCreationData();
    setItems([{ productId: '', quantity: 1 }]);
    setNotes('');
    setCreationError(null);
    setIsModalOpen(true);
  };

  const handleAddItemRow = () => {
    setItems([...items, { productId: '', quantity: 1 }]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof NewItemRow, value: any) => {
    const next = [...items];
    next[index] = { ...next[index], [field]: value };
    setItems(next);
  };

  const getProduct = (productId: string) => products.find((p) => p.id === productId);

  // Compute live estimate
  let estimatedTotal = 0;
  let estimatedUnits = 0;
  items.forEach((item) => {
    const p = getProduct(item.productId);
    if (p) {
      estimatedTotal += p.unitPrice * item.quantity;
      estimatedUnits += item.quantity;
    }
  });

  const handleCreateChallan = async (status: 'Draft' | 'Confirmed') => {
    setCreationError(null);

    // Validation
    if (!selectedCustomer) {
      setCreationError('Please select a customer.');
      return;
    }

    const invalidItems = items.some((i) => !i.productId || i.quantity <= 0);
    if (invalidItems) {
      setCreationError('Please select a product and valid quantity for all rows.');
      return;
    }

    // Pre-check stock if confirmed
    if (status === 'Confirmed') {
      for (const item of items) {
        const p = getProduct(item.productId);
        if (p && p.currentStock < item.quantity) {
          setCreationError(
            `Insufficient stock for '${p.name}'. Requested: ${item.quantity}, Available: ${p.currentStock}.`
          );
          return;
        }
      }
    }

    setCreating(true);
    try {
      await api.post('/challans', {
        customerId: selectedCustomer,
        status,
        notes,
        items,
      });

      setIsModalOpen(false);
      fetchChallans();
    } catch (err: any) {
      setCreationError(err.response?.data?.message || 'Failed to create sales challan.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sales Delivery Challans</h1>
          <p className="text-sm text-slate-500">
            Fulfill wholesale customer orders, auto-generate sequential delivery notes, and reduce stock.
          </p>
        </div>
        {hasRole('SALES', 'ADMIN') && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold shadow-sm transition"
          >
            <Plus size={18} /> Create Sales Challan
          </button>
        )}
      </div>

      {/* Filter / Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-3 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search Challan #, customer name, business..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Filter size={14} /> Status:
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Challans Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Challan #</th>
                <th className="py-3.5 px-4">Customer & Business</th>
                <th className="py-3.5 px-4 text-center">Items / Units</th>
                <th className="py-3.5 px-4 text-right">Total Amount</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4">Created Date</th>
                <th className="py-3.5 px-4">Created By</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Loading delivery challans...
                  </td>
                </tr>
              ) : challans.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No sales challans found.
                  </td>
                </tr>
              ) : (
                challans.map((ch) => (
                  <tr
                    key={ch.id}
                    onClick={() => onSelectChallan(ch.id)}
                    className="hover:bg-slate-50 cursor-pointer transition"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-primary-600 text-sm">
                      {ch.challanNumber}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 text-sm">
                        {ch.customer?.businessName || ch.customer?.name}
                      </div>
                      <div className="text-slate-500 text-xs flex items-center gap-1 mt-0.5">
                        <Building size={12} className="text-slate-400" />
                        {ch.customer?.name} ({ch.customer?.mobileNumber})
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="font-semibold text-slate-800">{ch.totalQuantity} units</span>
                      <div className="text-[10px] text-slate-400">({ch.items?.length} items)</div>
                    </td>

                    <td className="py-3.5 px-4 text-right font-bold text-slate-900 text-sm">
                      {formatCurrency(ch.totalAmount)}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusBadgeClass(
                          ch.status
                        )}`}
                      >
                        {ch.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      <div className="flex items-center gap-1">
                        <Calendar size={13} className="text-slate-400" />
                        {formatDate(ch.createdAt)}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 font-medium">{ch.createdByName}</td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectChallan(ch.id);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-primary-600 hover:bg-primary-50 rounded text-xs font-semibold transition"
                      >
                        <Eye size={14} /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Challan Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Sales Delivery Challan"
        maxWidth="max-w-4xl"
      >
        <div className="space-y-5">
          {creationError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{creationError}</span>
            </div>
          )}

          {/* Customer Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Customer *
              </label>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary-500 focus:outline-none"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.businessName} ({c.name}) — {c.customerType}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Challan Notes / Dispatch Instructions
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Dispatched via Express Logistics Van #DL-02-1234"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Multi-Product Line Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase text-slate-600 tracking-wider">
                Product Line Items
              </h4>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700"
              >
                <Plus size={14} /> Add Line Item
              </button>
            </div>

            <div className="space-y-2">
              {items.map((row, idx) => {
                const selectedProd = getProduct(row.productId);
                const isInsufficient =
                  selectedProd && selectedProd.currentStock < row.quantity;

                return (
                  <div
                    key={idx}
                    className="p-3 bg-white border border-slate-200 rounded-xl grid grid-cols-12 gap-3 items-center"
                  >
                    {/* Product Selector */}
                    <div className="col-span-12 sm:col-span-6">
                      <label className="block text-[11px] text-slate-500 mb-0.5">Product</label>
                      <select
                        value={row.productId}
                        onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">-- Choose Product --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} [{p.sku}] (Stock: {p.currentStock})
                          </option>
                        ))}
                      </select>
                      {selectedProd && (
                        <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-2">
                          <span>Unit Price: {formatCurrency(selectedProd.unitPrice)}</span>
                          <span
                            className={
                              selectedProd.currentStock > 0 ? 'text-emerald-600' : 'text-rose-600'
                            }
                          >
                            In Stock: {selectedProd.currentStock}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Quantity */}
                    <div className="col-span-5 sm:col-span-2">
                      <label className="block text-[11px] text-slate-500 mb-0.5">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={row.quantity}
                        onChange={(e) =>
                          handleItemChange(
                            idx,
                            'quantity',
                            Math.max(1, parseInt(e.target.value, 10) || 1)
                          )
                        }
                        className={`w-full px-2.5 py-1.5 border rounded-lg text-xs ${
                          isInsufficient
                            ? 'border-rose-300 bg-rose-50 text-rose-800'
                            : 'border-slate-300 bg-slate-50'
                        }`}
                      />
                    </div>

                    {/* Subtotal */}
                    <div className="col-span-5 sm:col-span-3 text-right">
                      <label className="block text-[11px] text-slate-500 mb-0.5">Line Total</label>
                      <span className="font-bold text-slate-800 text-sm">
                        {selectedProd
                          ? formatCurrency(selectedProd.unitPrice * row.quantity)
                          : '₹0.00'}
                      </span>
                    </div>

                    {/* Delete button */}
                    <div className="col-span-2 sm:col-span-1 text-right">
                      <label className="block text-[11px] text-transparent mb-0.5">X</label>
                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(idx)}
                        disabled={items.length <= 1}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded disabled:opacity-30"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grand Total Summary */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div className="text-xs text-slate-600">
              Total Units: <span className="font-bold text-slate-900">{estimatedUnits}</span>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500">Estimated Total Amount:</div>
              <div className="text-xl font-bold text-primary-600">
                {formatCurrency(estimatedTotal)}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="w-full sm:w-auto px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 transition"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={creating}
              onClick={() => handleCreateChallan('Draft')}
              className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition disabled:opacity-50"
            >
              {creating ? 'Saving...' : 'Save as Draft (No Stock Reduction)'}
            </button>

            <button
              type="button"
              disabled={creating}
              onClick={() => handleCreateChallan('Confirmed')}
              className="w-full sm:w-auto px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
            >
              {creating ? 'Processing...' : 'Confirm Delivery & Reduce Stock'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};