import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { DashboardStats } from '../types';
import { formatCurrency, formatDate, formatDateTime, getStatusBadgeClass } from '../utils/formatters';
import {
  Users,
  Package,
  FileSpreadsheet,
  Receipt,
  AlertTriangle,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

interface DashboardProps {
  onNavigate: (page: string) => void;
}

export const DashboardPage: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard/stats');
      setStats(res.data.data);
    } catch (err) {
      console.error('Failed to load dashboard stats', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center space-x-2 text-primary-600">
          <RefreshCw className="animate-spin" size={24} />
          <span className="font-medium">Loading operations dashboard...</span>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Top Welcome & KPI Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Operations Overview</h1>
          <p className="text-sm text-slate-500">
            Real-time warehouse inventory, customer pipeline, and sales fulfillment.
          </p>
        </div>
        <button
          onClick={fetchStats}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm transition"
        >
          <RefreshCw size={14} /> Refresh Data
        </button>
      </div>

      {/* Critical Low Stock Warning Banner */}
      {stats.inventory.lowStockCount > 0 && (
        <div className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <div className="font-semibold text-amber-900">
                Low Stock Alert: {stats.inventory.lowStockCount} item{stats.inventory.lowStockCount > 1 ? 's' : ''} below minimum threshold!
              </div>
              <div className="text-xs text-amber-700 mt-0.5">
                {stats.inventory.lowStockItems.map((i) => `${i.name} (${i.currentStock} left)`).join(', ')}
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigate('products')}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shrink-0 transition"
          >
            Review Inventory & Restock
          </button>
        </div>
      )}

      {/* 4 Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Customers */}
        <div
          onClick={() => onNavigate('customers')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-primary-300 hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Customers
            </span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-slate-900">{stats.customers.total}</span>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
              {stats.customers.active} Active
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {stats.customers.leads} Leads currently in CRM pipeline
          </div>
        </div>

        {/* Inventory Value */}
        <div
          onClick={() => onNavigate('products')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-primary-300 hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Stock Valuation
            </span>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Package size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">
              {formatCurrency(stats.inventory.totalInventoryValue)}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {stats.inventory.totalStockUnits} units across {stats.inventory.totalProducts} catalog products
          </div>
        </div>

        {/* Challans */}
        <div
          onClick={() => onNavigate('challans')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-primary-300 hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Sales Challans
            </span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileSpreadsheet size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-slate-900">{stats.challans.total}</span>
            <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
              {stats.challans.draft} Drafts
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {stats.challans.confirmed} Confirmed & dispatched challans
          </div>
        </div>

        {/* Invoiced Sales */}
        <div
          onClick={() => onNavigate('invoices')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-primary-300 hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Invoiced Sales
            </span>
            <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Receipt size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">
              {formatCurrency(stats.financials.totalInvoicedAmount)}
            </span>
            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              {formatCurrency(stats.financials.totalPaidAmount)} Paid
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {stats.financials.totalInvoices} total invoices generated
          </div>
        </div>
      </div>

      {/* Tables Row: Recent Challans & Stock Movements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Challans */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
              <FileSpreadsheet size={16} className="text-primary-600" />
              Recent Sales Challans
            </h3>
            <button
              onClick={() => onNavigate('challans')}
              className="text-xs font-semibold text-primary-600 hover:text-primary-700"
            >
              View All
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Challan #</th>
                  <th className="py-2.5 px-4 font-semibold">Customer</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Amount</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.recentChallans.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-4 font-mono font-medium text-primary-600">
                      {c.challanNumber}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-medium text-slate-800">
                        {c.customer?.businessName || c.customer?.name}
                      </div>
                      <div className="text-[10px] text-slate-400">{formatDate(c.createdAt)}</div>
                    </td>
                    <td className="py-2.5 px-4 text-right font-medium text-slate-800">
                      {formatCurrency(c.totalAmount)}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadgeClass(
                          c.status
                        )}`}
                      >
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Stock Movement Audit */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
              <TrendingUp size={16} className="text-primary-600" />
              Stock Movement Audit Log
            </h3>
            <button
              onClick={() => onNavigate('products')}
              className="text-xs font-semibold text-primary-600 hover:text-primary-700"
            >
              Inventory History
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Product</th>
                  <th className="py-2.5 px-4 font-semibold">Type</th>
                  <th className="py-2.5 px-4 font-semibold">Reason</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.recentMovements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-4">
                      <div className="font-medium text-slate-800">{m.product?.name}</div>
                      <div className="font-mono text-[10px] text-slate-400">{m.product?.sku}</div>
                    </td>
                    <td className="py-2.5 px-4">
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
                        {m.movementType} ({m.quantityChanged})
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 max-w-[150px] truncate" title={m.reason}>
                      {m.reason}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-400 text-[11px]">
                      {formatDateTime(m.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};