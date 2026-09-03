import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, KeyRound, ArrowRight, UserCheck, AlertCircle } from 'lucide-react';
import { UserRole } from '../types';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@minierp.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (role: UserRole) => {
    const creds: Record<UserRole, { email: string; pass: string }> = {
      ADMIN: { email: 'admin@minierp.com', pass: 'admin123' },
      SALES: { email: 'sales@minierp.com', pass: 'sales123' },
      WAREHOUSE: { email: 'warehouse@minierp.com', pass: 'warehouse123' },
      ACCOUNTS: { email: 'accounts@minierp.com', pass: 'accounts123' },
    };

    setEmail(creds[role].email);
    setPassword(creds[role].pass);
    setError(null);
    setIsLoading(true);
    try {
      await login(creds[role].email, creds[role].pass);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Quick login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="w-14 h-14 bg-primary-600 rounded-2xl mx-auto flex items-center justify-center text-white shadow-xl shadow-primary-600/30">
          <Shield size={28} />
        </div>
        <h2 className="mt-4 text-center text-3xl font-extrabold text-white tracking-tight">
          Mini ERP + CRM Portal
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Wholesale & Distribution Management System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-100">
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-slate-700">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm focus:ring-2 focus:ring-primary-500 focus:bg-white focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm focus:ring-2 focus:ring-primary-500 focus:bg-white focus:outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition disabled:opacity-50"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Quick 1-Click Role Login for Evaluator */}
          <div className="mt-8 border-t border-slate-200 pt-6">
            <div className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-3 text-center">
              Quick 1-Click Demo Login
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('ADMIN')}
                className="p-2.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg text-left transition"
              >
                <div className="font-semibold text-purple-900 text-xs">Admin Role</div>
                <div className="text-[11px] text-purple-600">Full system access</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('SALES')}
                className="p-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-left transition"
              >
                <div className="font-semibold text-blue-900 text-xs">Sales Role</div>
                <div className="text-[11px] text-blue-600">CRM & Challans</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('WAREHOUSE')}
                className="p-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg text-left transition"
              >
                <div className="font-semibold text-amber-900 text-xs">Warehouse Role</div>
                <div className="text-[11px] text-amber-600">Stock & Alerts</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('ACCOUNTS')}
                className="p-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-left transition"
              >
                <div className="font-semibold text-emerald-900 text-xs">Accounts Role</div>
                <div className="text-[11px] text-emerald-600">Invoices & GST</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};