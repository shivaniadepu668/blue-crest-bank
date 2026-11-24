/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { AuthPortal } from './components/AuthPortal';
import { CustomerOnboarding } from './components/CustomerOnboarding';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NavTab, SidebarLayout } from './components/SidebarLayout';
import { AccountsView } from './components/views/AccountsView';
import { AdminDashboardView } from './components/views/AdminDashboardView';
import { BalanceEnquiryView } from './components/views/BalanceEnquiryView';
import { BranchesView } from './components/views/BranchesView';
import { CustomersView } from './components/views/CustomersView';
import { LoansView } from './components/views/LoansView';
import { TransactionsDeskView } from './components/views/TransactionsDeskView';
import { BankAuthProvider, useBankAuth } from './context/BankAuthContext';

const BankingWorkspace: React.FC = () => {
  const { user, authReady, portalMode, currentCustomer, dataLoading } = useBankAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('enquiry');

  useEffect(() => {
    setActiveTab(portalMode === 'admin' ? 'overview' : 'enquiry');
  }, [portalMode]);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-blue-700 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-medium text-slate-600">Initializing secure session...</p>
        </div>
      </div>
    );
  }

  if (!user || !user.emailVerified) {
    return <AuthPortal />;
  }

  if (portalMode === 'customer' && !dataLoading && !currentCustomer) {
    return <CustomerOnboarding />;
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'overview':
        return <AdminDashboardView onNavigate={setActiveTab} />;
      case 'enquiry':
        return <BalanceEnquiryView onNavigate={setActiveTab} />;
      case 'customers':
        return <CustomersView />;
      case 'accounts':
        return <AccountsView />;
      case 'branches':
        return <BranchesView />;
      case 'teller':
        return <TransactionsDeskView mode="teller" />;
      case 'history':
        return <TransactionsDeskView mode="history" />;
      case 'loans':
        return <LoansView />;
      default:
        return portalMode === 'admin' ? (
          <AdminDashboardView onNavigate={setActiveTab} />
        ) : (
          <BalanceEnquiryView onNavigate={setActiveTab} />
        );
    }
  };

  return (
    <SidebarLayout activeTab={activeTab} onSelectTab={setActiveTab}>
      {renderActiveView()}
    </SidebarLayout>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <BankAuthProvider>
        <BankingWorkspace />
      </BankAuthProvider>
    </ErrorBoundary>
  );
}
