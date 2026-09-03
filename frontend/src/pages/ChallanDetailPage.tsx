import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Challan } from '../types';
import { formatCurrency, formatDate, formatDateTime, getStatusBadgeClass } from '../utils/formatters';
import { exportChallanPDF } from '../utils/pdfExport';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft,
  Download,
  CheckCircle2,
  XCircle,
  Building,
  Receipt,
  FileSpreadsheet,
  AlertCircle,
  Clock,
  Printer,
} from 'lucide-react';

interface ChallanDetailProps {
  challanId: string;
  onBack: () => void;
  onSelectInvoice?: (invoiceId: string) => void;
}

export const ChallanDetailPage: React.FC<ChallanDetailProps> = ({
  challanId,
  onBack,
  onSelectInvoice,
}) => {
  const { user, hasRole } = useAuth();
  const [challan, setChallan] = useState<Challan | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const fetchChallan = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/challans/${challanId}`);
      setChallan(res.data.data);
    } catch (err) {
      console.error('Failed to load challan detail', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallan();
  }, [challanId]);

  const handleUpdateStatus = async (status: 'Confirmed' | 'Cancelled') => {
    setActionError(null);
    setProcessing(true);
    try {
      await api.patch(`/challans/${challanId}/status`, { status });
      fetchChallan();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to update challan status.');
    } finally {
      setProcessing(false);
    }
  };

  const handleGenerateInvoice = async () => {
    setActionError(null);
    setProcessing(true);
    try {
      const res = await api.post(`/invoices/from-challan/${challanId}`, { taxRate: 18.0 });
      fetchChallan();
      if (onSelectInvoice && res.data.data?.id) {
        onSelectInvoice(res.data.data.id);
      }
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to generate invoice.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-500">
        Loading sales challan details...
      </div>
    );
  }

  if (!challan) {
    return (
      <div className="py-16 text-center text-slate-500">
        Challan not found.
        <button onClick={onBack} className="block mx-auto mt-3 text-primary-600 font-semibold">
          Return to challan list
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition shadow-sm"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
                {challan.challanNumber}
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadgeClass(
                  challan.status
                )}`}
              >
                {challan.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Created on {formatDateTime(challan.createdAt)} by {challan.createdByName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* PDF Download Button */}
          <button
            onClick={() => exportChallanPDF(challan)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <Download size={14} /> Download PDF Challan
          </button>

          {/* Confirm Draft Challan (reduces stock) */}
          {challan.status === 'Draft' && hasRole('SALES', 'WAREHOUSE', 'ADMIN') && (
            <button
              onClick={() => handleUpdateStatus('Confirmed')}
              disabled={processing}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
            >
              <CheckCircle2 size={14} /> Confirm & Deduct Stock
            </button>
          )}

          {/* Cancel Challan */}
          {challan.status !== 'Cancelled' && hasRole('SALES', 'ADMIN') && (
            <button
              onClick={() => handleUpdateStatus('Cancelled')}
              disabled={processing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition disabled:opacity-50"
            >
              <XCircle size={14} /> Cancel Challan
            </button>
          )}

          {/* Generate Invoice (Accounts / Admin) */}
          {challan.status === 'Confirmed' && !challan.invoice && hasRole('ACCOUNTS', 'ADMIN') && (
            <button
              onClick={handleGenerateInvoice}
              disabled={processing}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
            >
              <Receipt size={14} /> Generate Tax Invoice
            </button>
          )}

          {/* Invoice already generated pill */}
          {challan.invoice && (
            <span className="px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold flex items-center gap-1">
              <Receipt size={14} /> Invoice: {challan.invoice.invoiceNumber}
            </span>
          )}
        </div>
      </div>

      {actionError && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Meta Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Customer Box */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-xs space-y-2">
          <span className="font-semibold text-slate-800 uppercase tracking-wider text-[11px] block border-b border-slate-100 pb-2">
            Consignee Customer Info
          </span>
          <div className="font-bold text-slate-900 text-sm">
            {challan.customer?.businessName || challan.customer?.name}
          </div>
          <div className="text-slate-600">Contact Person: {challan.customer?.name}</div>
          <div className="text-slate-600">Mobile: {challan.customer?.mobileNumber}</div>
          <div className="text-slate-600">GSTIN: {challan.customer?.gstNumber || 'Unregistered'}</div>
          <div className="text-slate-500">{challan.customer?.address}</div>
        </div>

        {/* Dispatch Notes */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-xs space-y-2">
          <span className="font-semibold text-slate-800 uppercase tracking-wider text-[11px] block border-b border-slate-100 pb-2">
            Delivery & Dispatch Meta
          </span>
          <div className="text-slate-600">
            Status: <span className="font-bold text-slate-900">{challan.status}</span>
          </div>
          <div className="text-slate-600">
            Total Dispatched Units: <span className="font-bold text-slate-900">{challan.totalQuantity}</span>
          </div>
          <div className="text-slate-600">
            Notes / Vehicle Details:
            <p className="mt-1 p-2 bg-slate-50 rounded border border-slate-100 text-slate-700">
              {challan.notes || 'No dispatch notes specified.'}
            </p>
          </div>
        </div>
      </div>

      {/* Snapshot Items Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Challan Snapshot Items ({challan.items?.length || 0})
          </span>
          <span className="text-xs text-slate-400">
            Product snapshots are permanently preserved
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Item Name (Snapshot)</th>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4 text-right">Unit Price (Snapshot)</th>
                <th className="py-3 px-4 text-center">Quantity</th>
                <th className="py-3 px-4 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {challan.items.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 text-slate-400">{idx + 1}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    {item.productNameSnapshot}
                  </td>
                  <td className="py-3 px-4 font-mono text-primary-600">{item.skuSnapshot}</td>
                  <td className="py-3 px-4 text-right font-medium text-slate-800">
                    {formatCurrency(item.unitPriceSnapshot)}
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-slate-900">{item.quantity}</td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900">
                    {formatCurrency(item.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-semibold text-slate-800 border-t border-slate-200">
              <tr>
                <td colSpan={4} className="py-3.5 px-4 text-right">
                  Total Delivery Amount:
                </td>
                <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                  {challan.totalQuantity} units
                </td>
                <td className="py-3.5 px-4 text-right text-base font-bold text-primary-600">
                  {formatCurrency(challan.totalAmount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};