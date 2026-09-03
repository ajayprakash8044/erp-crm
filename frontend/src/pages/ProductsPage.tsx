import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Product, StockMovement, MovementType } from '../types';
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters';
import { Modal } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import {
  Package,
  Search,
  Plus,
  Edit2,
  AlertTriangle,
  ArrowUpDown,
  History,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Layers,
  Filter,
} from 'lucide-react';

export const ProductsPage: React.FC = () => {
  const { hasRole } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productFormError, setProductFormError] = useState<string | null>(null);
  const [productSaving, setProductSaving] = useState(false);

  // Stock Adjustment Modal
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [stockQty, setStockQty] = useState(1);
  const [stockType, setStockType] = useState<MovementType>('IN');
  const [stockReason, setStockReason] = useState('Purchase receipt intake');
  const [stockModalError, setStockModalError] = useState<string | null>(null);
  const [stockSaving, setStockSaving] = useState(false);

  // Movement Log Modal
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [logProduct, setLogProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);

  // Product Form state
  const [form, setForm] = useState({
    name: '',
    sku: '',
    category: 'Electronics',
    unitPrice: 1000,
    currentStock: 10,
    minStockAlert: 5,
    location: 'Bay A-01',
  });

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/products', {
        params: {
          search,
          category: categoryFilter,
          lowStockOnly: lowStockOnly ? 'true' : undefined,
          limit: 100,
        },
      });
      setProducts(res.data.data.products);
    } catch (err) {
      console.error('Failed to load products', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search, categoryFilter, lowStockOnly]);

  const openAddModal = () => {
    setEditingProduct(null);
    setForm({
      name: '',
      sku: '',
      category: 'Electronics',
      unitPrice: 1000,
      currentStock: 10,
      minStockAlert: 5,
      location: 'Bay A-01',
    });
    setProductFormError(null);
    setIsProductModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setForm({
      name: p.name,
      sku: p.sku,
      category: p.category,
      unitPrice: p.unitPrice,
      currentStock: p.currentStock,
      minStockAlert: p.minStockAlert,
      location: p.location,
    });
    setProductFormError(null);
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setProductSaving(true);
    setProductFormError(null);
    try {
      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, {
          name: form.name,
          sku: form.sku,
          category: form.category,
          unitPrice: Number(form.unitPrice),
          minStockAlert: Number(form.minStockAlert),
          location: form.location,
        });
      } else {
        await api.post('/products', {
          ...form,
          unitPrice: Number(form.unitPrice),
          currentStock: Number(form.currentStock),
          minStockAlert: Number(form.minStockAlert),
        });
      }
      setIsProductModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      setProductFormError(err.response?.data?.message || 'Failed to save product.');
    } finally {
      setProductSaving(false);
    }
  };

  const openStockModal = (p: Product) => {
    setAdjustingProduct(p);
    setStockQty(1);
    setStockType('IN');
    setStockReason('Purchase receipt intake');
    setStockModalError(null);
    setIsStockModalOpen(true);
  };

  const handleSaveStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;

    setStockSaving(true);
    setStockModalError(null);
    try {
      await api.post(`/products/${adjustingProduct.id}/stock-movement`, {
        quantity: Number(stockQty),
        movementType: stockType,
        reason: stockReason,
      });
      setIsStockModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      setStockModalError(err.response?.data?.message || 'Stock adjustment failed.');
    } finally {
      setStockSaving(false);
    }
  };

  const openLogModal = async (p?: Product) => {
    setLogProduct(p || null);
    setIsLogModalOpen(true);
    setLoadingMovements(true);
    try {
      const res = await api.get('/products/movements', {
        params: {
          productId: p?.id,
          limit: 50,
        },
      });
      setMovements(res.data.data.movements);
    } catch (err) {
      console.error('Failed to load movements log', err);
    } finally {
      setLoadingMovements(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Products & Inventory</h1>
          <p className="text-sm text-slate-500">
            Real-time warehouse stock tracking, threshold alert monitoring, and audit logs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openLogModal()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-semibold shadow-sm transition"
          >
            <History size={16} /> Audit Movement Log
          </button>
          {hasRole('WAREHOUSE', 'ADMIN') && (
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold shadow-sm transition"
            >
              <Plus size={18} /> Add Product
            </button>
          )}
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-3 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search SKU, product name, bay location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Filter size={14} /> Category:
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="ALL">All Categories</option>
            <option value="Electronics">Electronics</option>
            <option value="Hardware">Hardware</option>
            <option value="Packaging">Packaging</option>
          </select>

          <button
            onClick={() => setLowStockOnly(!lowStockOnly)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition ${
              lowStockOnly
                ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-inner'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <AlertTriangle size={14} className={lowStockOnly ? 'text-amber-600' : 'text-slate-400'} />
            Low Stock Alerts Only
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Item & SKU</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Location / Bay</th>
                <th className="py-3.5 px-4 text-right">Unit Price</th>
                <th className="py-3.5 px-4 text-center">Current Stock</th>
                <th className="py-3.5 px-4 text-center">Alert Min</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Loading inventory catalog...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No products found matching the criteria.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 text-sm">{p.name}</div>
                      <div className="font-mono text-primary-600 text-xs mt-0.5">{p.sku}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-medium">
                        {p.category}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      <div className="flex items-center gap-1">
                        <MapPin size={13} className="text-slate-400" />
                        {p.location}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right font-medium text-slate-800 text-sm">
                      {formatCurrency(p.unitPrice)}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`text-sm font-bold ${
                          p.isLowStock ? 'text-amber-700' : 'text-slate-900'
                        }`}
                      >
                        {p.currentStock}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center text-slate-500 font-medium">
                      {p.minStockAlert}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {p.isLowStock ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                          <AlertTriangle size={12} /> Low Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 size={12} /> Optimal
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* Audit Log for item */}
                        <button
                          onClick={() => openLogModal(p)}
                          title="View Item Stock History"
                          className="p-1.5 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded transition"
                        >
                          <History size={16} />
                        </button>

                        {/* Adjust Stock (Warehouse / Admin) */}
                        {hasRole('WAREHOUSE', 'ADMIN') && (
                          <button
                            onClick={() => openStockModal(p)}
                            title="Quick Stock Inward/Outward"
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition"
                          >
                            <ArrowUpDown size={16} />
                          </button>
                        )}

                        {/* Edit Product (Warehouse / Admin) */}
                        {hasRole('WAREHOUSE', 'ADMIN') && (
                          <button
                            onClick={() => openEditModal(p)}
                            title="Edit Product"
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded transition"
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title={editingProduct ? `Edit Product: ${editingProduct.name}` : 'Add New Inventory Product'}
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          {productFormError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{productFormError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Product Name *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-primary-500 focus:bg-white focus:outline-none"
                placeholder="e.g. Wireless Industrial Barcode Scanner"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                SKU / Item Code *
              </label>
              <input
                type="text"
                required
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-primary-500 focus:bg-white focus:outline-none"
                placeholder="e.g. SCN-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
              <input
                type="text"
                required
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-primary-500 focus:bg-white focus:outline-none"
                placeholder="e.g. Electronics / Packaging / Hardware"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Unit Price (₹) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={form.unitPrice}
                onChange={(e) => setForm({ ...form, unitPrice: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-primary-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Warehouse Bay / Location *
              </label>
              <input
                type="text"
                required
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-primary-500 focus:bg-white focus:outline-none"
                placeholder="e.g. Bay C-14, Shelf 3"
              />
            </div>

            {!editingProduct && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Initial Stock Intake *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={form.currentStock}
                  onChange={(e) => setForm({ ...form, currentStock: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-primary-500 focus:bg-white focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Minimum Stock Alert Quantity *
              </label>
              <input
                type="number"
                min="0"
                required
                value={form.minStockAlert}
                onChange={(e) => setForm({ ...form, minStockAlert: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-primary-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsProductModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={productSaving}
              className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
            >
              {productSaving ? 'Saving...' : editingProduct ? 'Update Product' : 'Add to Inventory'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Adjust Stock (Inward / Outward) Modal */}
      <Modal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        title={`Adjust Stock: ${adjustingProduct?.name}`}
      >
        <form onSubmit={handleSaveStockAdjustment} className="space-y-4">
          {stockModalError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{stockModalError}</span>
            </div>
          )}

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Current Stock in Warehouse:</span>
              <span className="font-bold text-slate-800 text-sm">
                {adjustingProduct?.currentStock} units
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Warehouse Location:</span>
              <span className="font-medium text-slate-700">{adjustingProduct?.location}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Adjustment Type *
              </label>
              <select
                value={stockType}
                onChange={(e) => setStockType(e.target.value as MovementType)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-primary-500 focus:bg-white focus:outline-none"
              >
                <option value="IN">IN (Inward Stock / Purchase / Return)</option>
                <option value="OUT">OUT (Outward / Damage / Shrinkage)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quantity Units *
              </label>
              <input
                type="number"
                min="1"
                required
                value={stockQty}
                onChange={(e) => setStockQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-primary-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason for Adjustment *
            </label>
            <input
              type="text"
              required
              value={stockReason}
              onChange={(e) => setStockReason(e.target.value)}
              placeholder="e.g. Received Purchase Order #PO-892, Damaged in transit, Physical count correction"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-primary-500 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsStockModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={stockSaving}
              className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
            >
              {stockSaving ? 'Adjusting...' : 'Confirm Stock Adjustment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Movement Audit Log Modal */}
      <Modal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        title={logProduct ? `Movement Audit Log: ${logProduct.name}` : 'Warehouse Stock Movement Audit Log'}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4">
          <div className="overflow-x-auto max-h-[60vh]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Product</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3">Reason / Reference</th>
                  <th className="py-2.5 px-3">Logged By</th>
                  <th className="py-2.5 px-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingMovements ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Loading audit records...
                    </td>
                  </tr>
                ) : movements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No stock movements recorded yet.
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800">{m.product?.name}</div>
                        <div className="font-mono text-[10px] text-slate-400">{m.product?.sku}</div>
                      </td>

                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded text-[10px] ${
                            m.movementType === 'IN'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {m.movementType === 'IN' ? (
                            <ArrowUpRight size={12} />
                          ) : (
                            <ArrowDownRight size={12} />
                          )}
                          {m.movementType}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                        {m.quantityChanged}
                      </td>

                      <td className="py-2.5 px-3 text-slate-700">{m.reason}</td>

                      <td className="py-2.5 px-3 text-slate-600 font-medium">{m.createdByName}</td>

                      <td className="py-2.5 px-3 text-right text-slate-400 text-[11px]">
                        {formatDateTime(m.timestamp)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              onClick={() => setIsLogModalOpen(false)}
              className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};