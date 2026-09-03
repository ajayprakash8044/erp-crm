import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Invoice } from '../types';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/formatters';
import { exportInvoicePDF } from '../utils/pdfExport';
import { Modal } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import {
  Receipt,
  Search,
  Download,
  Eye,
  CheckCircle2,
  Calendar,
  Building,
  Filter,
  CreditCard,
  Printer,
} from 'lucide-react';

export const InvoicesPage: React.FC = () => {
  const { hasRole } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // View modal
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await api.get('/invoices', {
        params: {
          search,
          status: statusFilter,
          limit: 50,
        },
      });
      setInvoices(res.data.data.invoices);
    } catch (err) {
      console.error('Failed to load invoices', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [search, statusFilter]);

  const handleUpdateStatus = async (invoiceId: string, status: 'Paid' | 'Cancelled') => {
    setStatusUpdating(true);
    try {
      await api.patch(`/invoices/${invoiceId}/status`, { status });
      fetchInvoices();
      if (viewingInvoice?.id === invoiceId) {
        const updated = await api.get(`/invoices/${invoiceId}`);
        setViewingInvoice(updated.data.data);
      }
    } catch (err) {
      console.error('Failed to update invoice status', err);
    } finally {
      setStatusUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Invoices & Billing</h1>
          <p className="text-sm text-slate-500">
            GST-compliant invoices generated from confirmed delivery challans with PDF download.
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-3 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search Invoice #, customer, challan #..."
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
            <option value="Unpaid">Unpaid</option>
            <option value="Paid">Paid</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Invoice #</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Challan Ref</th>
                <th className="py-3.5 px-4 text-right">Subtotal</th>
                <th className="py-3.5 px-4 text-right">Tax (18%)</th>
                <th className="py-3.5 px-4 text-right">Grand Total</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4">Due Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No invoices found. Generate an invoice from any Confirmed Delivery Challan.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => setViewingInvoice(inv)}
                    className="hover:bg-slate-50 cursor-pointer transition"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-primary-600 text-sm">
                      {inv.invoiceNumber}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 text-sm">
                        {inv.customer?.businessName || inv.customer?.name}
                      </div>
                      <div className="text-slate-400 text-xs font-mono mt-0.5">
                        GST: {inv.customer?.gstNumber || 'Exempt'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {inv.challan?.challanNumber}
                    </td>

                    <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                      {formatCurrency(inv.subtotal)}
                    </td>

                    <td className="py-3.5 px-4 text-right text-slate-500">
                      {formatCurrency(inv.taxAmount)}
                    </td>

                    <td className="py-3.5 px-4 text-right font-bold text-slate-900 text-sm">
                      {formatCurrency(inv.grandTotal)}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusBadgeClass(
                          inv.status
                        )}`}
                      >
                        {inv.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      <div className="flex items-center gap-1">
                        <Calendar size={13} className="text-slate-400" />
                        {formatDate(inv.dueDate)}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            exportInvoicePDF(inv);
                          }}
                          title="Export Invoice PDF"
                          className="p-1.5 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded transition"
                        >
                          <Download size={16} />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingInvoice(inv);
                          }}
                          title="View Details"
                          className="p-1.5 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded transition"
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice View Modal */}
      <Modal
        isOpen={!!viewingInvoice}
        onClose={() => setViewingInvoice(null)}
        title={viewingInvoice ? `Tax Invoice: ${viewingInvoice.invoiceNumber}` : 'Tax Invoice'}
        maxWidth="max-w-3xl"
      >
        {viewingInvoice && (
          <div className="space-y-6">
            {/* Header / Actions Bar */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeClass(
                    viewingInvoice.status
                  )}`}
                >
                  {viewingInvoice.status}
                </span>
                <span className="text-xs text-slate-400">
                  Issued: {formatDate(viewingInvoice.createdAt)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportInvoicePDF(viewingInvoice)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                >
                  <Download size={14} /> Download PDF Invoice
                </button>

                {viewingInvoice.status === 'Unpaid' && hasRole('ACCOUNTS', 'ADMIN') && (
                  <button
                    onClick={() => handleUpdateStatus(viewingInvoice.id, 'Paid')}
                    disabled={statusUpdating}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
                  >
                    <CheckCircle2 size={14} /> Mark as Paid
                  </button>
                )}
              </div>
            </div>

            {/* Bill To Info */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="space-y-1">
                <span className="text-slate-400 uppercase font-semibold text-[10px]">Billed To:</span>
                <div className="font-bold text-slate-900 text-sm">
                  {viewingInvoice.customer?.businessName || viewingInvoice.customer?.name}
                </div>
                <div className="text-slate-600">GSTIN: {viewingInvoice.customer?.gstNumber || 'Exempt'}</div>
                <div className="text-slate-500">{viewingInvoice.customer?.address}</div>
              </div>

              <div className="space-y-1 text-right">
                <span className="text-slate-400 uppercase font-semibold text-[10px]">Reference:</span>
                <div className="font-mono text-slate-800">
                  Challan: {viewingInvoice.challan?.challanNumber}
                </div>
                <div className="text-slate-600">Payment Due: {formatDate(viewingInvoice.dueDate)}</div>
              </div>
            </div>

            {/* Itemized table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {viewingInvoice.challan.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2.5 px-3 font-medium text-slate-800">
                        {item.productNameSnapshot}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">{item.skuSnapshot}</td>
                      <td className="py-2.5 px-3 text-center font-semibold text-slate-800">
                        {item.quantity}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600">
                        {formatCurrency(item.unitPriceSnapshot)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                        {formatCurrency(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Tax & Grand Total */}
              <div className="bg-slate-50/80 p-4 border-t border-slate-200 space-y-1.5 text-right">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Taxable Subtotal:</span>
                  <span className="font-semibold">{formatCurrency(viewingInvoice.subtotal)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Goods & Services Tax (GST {viewingInvoice.taxRate}%):</span>
                  <span className="font-semibold">{formatCurrency(viewingInvoice.taxAmount)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                  <span>Grand Total Payable:</span>
                  <span className="text-primary-600">{formatCurrency(viewingInvoice.grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};