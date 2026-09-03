import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { CustomersPage } from './pages/CustomersPage';
import { CustomerDetailPage } from './pages/CustomerDetailPage';
import { ProductsPage } from './pages/ProductsPage';
import { ChallansPage } from './pages/ChallansPage';
import { ChallanDetailPage } from './pages/ChallanDetailPage';
import { InvoicesPage } from './pages/InvoicesPage';

export const App: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedChallanId, setSelectedChallanId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-slate-300">Initializing Mini ERP & CRM...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const navigateTo = (page: string) => {
    setSelectedCustomerId(null);
    setSelectedChallanId(null);
    setCurrentPage(page);
  };

  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setCurrentPage('customer-detail');
  };

  const handleSelectChallan = (challanId: string) => {
    setSelectedChallanId(challanId);
    setCurrentPage('challan-detail');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <Navbar />
      <div className="flex-1 flex">
        <Sidebar currentPage={currentPage} onNavigate={navigateTo} />
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
          {currentPage === 'dashboard' && <DashboardPage onNavigate={navigateTo} />}
          
          {currentPage === 'customers' && (
            <CustomersPage onSelectCustomer={handleSelectCustomer} />
          )}

          {currentPage === 'customer-detail' && selectedCustomerId && (
            <CustomerDetailPage
              customerId={selectedCustomerId}
              onBack={() => setCurrentPage('customers')}
              onSelectChallan={handleSelectChallan}
            />
          )}

          {currentPage === 'products' && <ProductsPage />}

          {currentPage === 'challans' && (
            <ChallansPage onSelectChallan={handleSelectChallan} />
          )}

          {currentPage === 'challan-detail' && selectedChallanId && (
            <ChallanDetailPage
              challanId={selectedChallanId}
              onBack={() => setCurrentPage('challans')}
              onSelectInvoice={() => setCurrentPage('invoices')}
            />
          )}

          {currentPage === 'invoices' && <InvoicesPage />}
        </main>
      </div>
    </div>
  );
};