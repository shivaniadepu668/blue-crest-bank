import React, { useState } from 'react';
import {
  ArrowLeftRight,
  Building2,
  CreditCard,
  History,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  Scale,
  Shield,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useBankAuth } from '../context/BankAuthContext';

export type NavTab =
  | 'overview'
  | 'customers'
  | 'accounts'
  | 'branches'
  | 'teller'
  | 'history'
  | 'loans'
  | 'enquiry';

interface SidebarLayoutProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  children: React.ReactNode;
}

export const SidebarLayout: React.FC<SidebarLayoutProps> = ({
  activeTab,
  onSelectTab,
  children,
}) => {
  const { user, isAdmin, portalMode, setPortalMode, currentCustomer, logout } = useBankAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const adminNav: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'overview', label: 'Admin Dashboard', icon: LayoutDashboard },
    { id: 'customers', label: 'Customer Management', icon: Users },
    { id: 'accounts', label: 'Bank Accounts', icon: CreditCard },
    { id: 'branches', label: 'Branch Management', icon: Landmark },
    { id: 'teller', label: 'Simulated Teller', icon: ArrowLeftRight },
    { id: 'history', label: 'Transaction Ledger', icon: History },
    { id: 'loans', label: 'Loan Management', icon: Scale },
  ];

  const customerNav: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'enquiry', label: 'Balance Enquiry', icon: Wallet },
    { id: 'accounts', label: 'My Accounts', icon: CreditCard },
    { id: 'teller', label: 'Deposit & Withdraw', icon: ArrowLeftRight },
    { id: 'history', label: 'Transaction History', icon: History },
    { id: 'loans', label: 'Loans & Repayments', icon: Scale },
    { id: 'branches', label: 'Branches', icon: Landmark },
  ];

  const navItems = portalMode === 'admin' ? adminNav : customerNav;
  const activeNavObj = navItems.find((item) => item.id === activeTab) || navItems[0];

  const handleNavClick = (id: NavTab) => {
    onSelectTab(id);
    setMobileMenuOpen(false);
  };

  const handlePortalSwitch = (nextMode: 'admin' | 'customer') => {
    setPortalMode(nextMode);
    onSelectTab(nextMode === 'admin' ? 'overview' : 'enquiry');
    setMobileMenuOpen(false);
  };

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-[#0B1F3A] text-slate-100">
      <div className="h-16 px-5 flex items-center justify-between border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2.5 whitespace-nowrap">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <span className="font-display text-base font-semibold tracking-tight text-white">
            BlueCrest Bank
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close navigation menu"
          className="lg:hidden p-1.5 text-slate-300 hover:text-white rounded-md"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {isAdmin && (
        <div className="px-4 pt-4 pb-2">
          <div className="grid grid-cols-2 gap-1 p-1 bg-[#071426] rounded-lg border border-white/10">
            <button
              type="button"
              onClick={() => handlePortalSwitch('admin')}
              className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                portalMode === 'admin'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => handlePortalSwitch('customer')}
              className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                portalMode === 'customer'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Customer
            </button>
          </div>
        </div>
      )}

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Main navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-white/8 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10 space-y-3">
        <div className="text-xs">
          <p className="font-medium text-white truncate">
            {currentCustomer?.fullName || user?.displayName || 'Authenticated User'}
          </p>
          <p className="text-slate-400 truncate mt-0.5">{user?.email}</p>
          <p className="text-blue-300 mt-1 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 shrink-0" />
            <span>{isAdmin ? 'Administrator' : 'Verified Customer'}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-200 border border-white/15 rounded-lg hover:bg-white/10 transition-colors whitespace-nowrap"
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-slate-200 sticky top-0 h-screen">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] h-full z-10">
            {renderSidebarContent()}
          </aside>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar Contract: Breadcrumb on left, 1 primary action on right */}
        <header className="h-14 lg:h-16 bg-white border-b border-slate-200 px-4 lg:px-8 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-500 hidden sm:inline whitespace-nowrap">
                {portalMode === 'admin' ? 'Operations' : 'Customer Portal'}
              </span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <h1 className="font-display font-semibold text-slate-900 truncate">
                {activeNavObj?.label}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => handleNavClick('teller')}
              className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              New Transaction
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {children}
        </main>

        <footer className="px-6 py-4 border-t border-slate-200 bg-white text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span>BlueCrest Bank Management System</span>
          <span>Simulated banking workspace — No real credentials or real-money transfers.</span>
        </footer>
      </div>
    </div>
  );
};
