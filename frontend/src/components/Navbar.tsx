import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Shield, User as UserIcon, RefreshCw } from 'lucide-react';
import { UserRole } from '../types';

export const Navbar: React.FC = () => {
  const { user, logout, switchRole } = useAuth();

  const roleColors: Record<UserRole, string> = {
    ADMIN: 'bg-purple-100 text-purple-800 border-purple-200',
    SALES: 'bg-blue-100 text-blue-800 border-blue-200',
    WAREHOUSE: 'bg-amber-100 text-amber-800 border-amber-200',
    ACCOUNTS: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 px-4 md:px-8 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center shadow-md shadow-primary-500/20 text-white font-bold text-lg">
          M
        </div>
        <div>
          <span className="font-bold text-slate-900 tracking-tight text-lg">Mini ERP + CRM</span>
          <span className="hidden sm:inline-block ml-2 text-xs font-medium text-slate-400">
            Operations Portal
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-3 sm:space-x-6">
        {/* Quick Role Switcher for seamless testing */}
        <div className="hidden lg:flex items-center space-x-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
          <span className="text-slate-500 font-medium px-2 flex items-center gap-1">
            <RefreshCw size={12} /> Role Demo:
          </span>
          {(['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'] as UserRole[]).map((r) => (
            <button
              key={r}
              onClick={() => switchRole(r)}
              className={`px-2.5 py-1 rounded font-medium transition ${
                user?.role === r
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* User Info & Role Badge */}
        {user && (
          <div className="flex items-center space-x-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-slate-800 leading-tight">{user.name}</div>
              <div className="text-xs text-slate-500">{user.email}</div>
            </div>

            <span
              className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border flex items-center gap-1 ${
                roleColors[user.role]
              }`}
            >
              <Shield size={12} />
              {user.role}
            </span>

            <button
              onClick={logout}
              title="Logout"
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
            >
              <LogOut size={18} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};