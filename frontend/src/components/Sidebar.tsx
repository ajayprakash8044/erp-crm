import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Package,
  FileSpreadsheet,
  Receipt,
  Boxes,
  HelpCircle,
} from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const { user } = useAuth();

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'],
    },
    {
      id: 'customers',
      label: 'Customer CRM',
      icon: Users,
      roles: ['ADMIN', 'SALES', 'ACCOUNTS'],
    },
    {
      id: 'products',
      label: 'Products & Stock',
      icon: Package,
      roles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'],
    },
    {
      id: 'challans',
      label: 'Sales Challans',
      icon: FileSpreadsheet,
      roles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'],
    },
    {
      id: 'invoices',
      label: 'Invoices & Billing',
      icon: Receipt,
      roles: ['ADMIN', 'ACCOUNTS', 'SALES'],
    },
  ];

  const visibleItems = navItems.filter(
    (item) => user?.role === 'ADMIN' || (user?.role && item.roles.includes(user.role))
  );

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 min-h-[calc(100vh-4rem)] flex flex-col p-4">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-3">
        Operations Menu
      </div>
      <nav className="space-y-1.5 flex-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${
                isActive
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Role permission hint box */}
      <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700/50 text-xs text-slate-400 mt-6">
        <div className="flex items-center gap-1.5 text-slate-200 font-semibold mb-1">
          <HelpCircle size={14} className="text-primary-400" />
          Active Role: {user?.role}
        </div>
        <p className="text-[11px] leading-relaxed text-slate-400">
          {user?.role === 'ADMIN' && 'Full system control, inventory updates, challan overrides & financials.'}
          {user?.role === 'SALES' && 'Manage customers, follow-ups, and create/confirm sales challans.'}
          {user?.role === 'WAREHOUSE' && 'Monitor stock alerts, receive products, and log movements.'}
          {user?.role === 'ACCOUNTS' && 'Manage invoices, tax calculations, and export payment receipts.'}
        </p>
      </div>
    </aside>
  );
};