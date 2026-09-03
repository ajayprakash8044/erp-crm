import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Customer, CustomerFollowUp } from '../types';
import { formatDate, formatDateTime, formatCurrency, getStatusBadgeClass } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft,
  Building,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  MessageSquare,
  Plus,
  FileSpreadsheet,
  Receipt,
  Clock,
  Send,
  AlertCircle,
} from 'lucide-react';

interface CustomerDetailProps {
  customerId: string;
  onBack: () => void;
  onSelectChallan: (challanId: string) => void;
}

export const CustomerDetailPage: React.FC<CustomerDetailProps> = ({
  customerId,
  onBack,
  onSelectChallan,
}) => {
  const { user, hasRole } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/customers/${customerId}`);
      setCustomer(res.data.data);
    } catch (err) {
      console.error('Failed to fetch customer details', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomer();
  }, [customerId]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setSubmittingNote(true);
    setNoteError(null);
    try {
      await api.post(`/customers/${customerId}/notes`, { note: newNote.trim() });
      setNewNote('');
      fetchCustomer();
    } catch (err: any) {
      setNoteError(err.response?.data?.message || 'Failed to submit follow-up note.');
    } finally {
      setSubmittingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-500">
        Loading customer profile and history...
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="py-16 text-center text-slate-500">
        Customer not found.
        <button onClick={onBack} className="block mx-auto mt-3 text-primary-600 font-semibold">
          Return to directory
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button & Title */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onBack}
          className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition shadow-sm"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{customer.name}</h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadgeClass(
                customer.status
              )}`}
            >
              {customer.status}
            </span>
            <span className="px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-semibold">
              {customer.customerType}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Registered on {formatDate(customer.createdAt)}
          </p>
        </div>
      </div>

      {/* Main Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Profile & Follow-ups */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Customer Profile Summary */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-semibold text-sm text-slate-800 border-b border-slate-100 pb-3">
              Commercial & Contact Profile
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400 font-medium flex items-center gap-1">
                  <Building size={14} /> Business Entity
                </span>
                <span className="font-semibold text-slate-800 text-sm block">
                  {customer.businessName}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 font-medium flex items-center gap-1">
                  <CreditCard size={14} /> GST Identification (GSTIN)
                </span>
                <span className="font-mono font-semibold text-slate-800 text-sm block">
                  {customer.gstNumber || 'Unregistered / Exempt'}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 font-medium flex items-center gap-1">
                  <Phone size={14} /> Mobile Contact
                </span>
                <span className="font-medium text-slate-800 block">{customer.mobileNumber}</span>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 font-medium flex items-center gap-1">
                  <Mail size={14} /> Email Address
                </span>
                <span className="font-medium text-slate-800 block">{customer.email}</span>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <span className="text-slate-400 font-medium flex items-center gap-1">
                  <MapPin size={14} /> Registered Address
                </span>
                <span className="font-medium text-slate-700 block">{customer.address}</span>
              </div>

              {customer.notes && (
                <div className="space-y-1 sm:col-span-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-500 font-semibold block">Account Notes:</span>
                  <p className="text-slate-600 leading-relaxed">{customer.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Card: Follow-up History Timeline & Note Adder */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-semibold text-sm text-slate-800 flex items-center gap-2">
                <MessageSquare size={16} className="text-primary-600" />
                CRM Follow-up Timeline ({customer.followUps?.length || 0})
              </h3>
              {customer.followUpDate && (
                <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                  <Calendar size={12} /> Next Follow-up: {formatDate(customer.followUpDate)}
                </span>
              )}
            </div>

            {/* Note Input for Sales/Admin */}
            {hasRole('SALES', 'ADMIN') && (
              <form onSubmit={handleAddNote} className="space-y-2">
                {noteError && (
                  <div className="p-2 rounded bg-rose-50 text-rose-700 text-xs flex items-center gap-1">
                    <AlertCircle size={14} /> {noteError}
                  </div>
                )}
                <div className="relative">
                  <textarea
                    rows={2}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Log a client interaction, phone call discussion, price negotiation, or follow-up note..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary-500 focus:bg-white focus:outline-none transition pr-12"
                  />
                  <button
                    type="submit"
                    disabled={submittingNote || !newNote.trim()}
                    className="absolute right-2.5 bottom-3.5 p-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-md shadow-sm transition disabled:opacity-40"
                    title="Submit note"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </form>
            )}

            {/* Timeline Notes List */}
            <div className="space-y-3 pt-2">
              {customer.followUps && customer.followUps.length > 0 ? (
                customer.followUps.map((fn) => (
                  <div
                    key={fn.id}
                    className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs space-y-1 hover:border-slate-200 transition"
                  >
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="font-semibold text-slate-800">{fn.createdByName}</span>
                      <span className="flex items-center gap-1 text-[11px] text-slate-400">
                        <Clock size={11} /> {formatDateTime(fn.createdAt)}
                      </span>
                    </div>
                    <p className="text-slate-700 leading-relaxed">{fn.note}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No interaction notes logged yet for this customer.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Associated Delivery Challans & Invoices */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-semibold text-sm text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
              <FileSpreadsheet size={16} className="text-primary-600" />
              Sales Challans ({customer.challans?.length || 0})
            </h3>

            <div className="space-y-2">
              {customer.challans && customer.challans.length > 0 ? (
                customer.challans.map((ch) => (
                  <div
                    key={ch.id}
                    onClick={() => onSelectChallan(ch.id)}
                    className="p-3 border border-slate-200 rounded-lg hover:border-primary-300 hover:bg-primary-50/40 cursor-pointer transition text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-semibold text-primary-600">
                        {ch.challanNumber}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusBadgeClass(
                          ch.status
                        )}`}
                      >
                        {ch.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500">
                      <span>{formatDate(ch.createdAt)}</span>
                      <span className="font-semibold text-slate-800">
                        {formatCurrency(ch.totalAmount)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No challans created for this customer yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};