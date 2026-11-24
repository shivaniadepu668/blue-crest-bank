import React, { useMemo, useState } from 'react';
import { CreditCard, Lock, Plus, Search, Unlock, X } from 'lucide-react';
import { useBankAuth } from '../../context/BankAuthContext';
import {
  adminUpdateAccount,
  BusinessValidationError,
  openBankAccount,
} from '../../services/bankingService';
import { AccountStatus, AccountType, BankAccount } from '../../types/banking';
import { formatCurrency, formatDateOnly } from '../../utils/format';

export const AccountsView: React.FC = () => {
  const { accounts, customers, branches, currentCustomer, portalMode, user } = useBankAuth();
  const isAdminView = portalMode === 'admin';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AccountStatus>('all');
  const [modalOpen, setModalOpen] = useState(false);

  const activeBranches = useMemo(() => branches.filter((b) => b.status === 'active'), [branches]);

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('Savings');
  const [initialDeposit, setInitialDeposit] = useState('0');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const customerMap = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const branchMap = useMemo(() => new Map(branches.map((b) => [b.id, b])), [branches]);

  const filteredAccounts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return accounts.filter((acc) => {
      if (statusFilter !== 'all' && acc.status !== statusFilter) return false;
      if (!q) return true;
      const cust = customerMap.get(acc.customerId);
      return (
        acc.accountNumber.toLowerCase().includes(q) ||
        acc.accountType.toLowerCase().includes(q) ||
        (cust?.fullName.toLowerCase().includes(q) ?? false)
      );
    });
  }, [accounts, searchQuery, statusFilter, customerMap]);

  const openCreateModal = () => {
    setSelectedCustomerId(
      isAdminView ? customers[0]?.id || '' : currentCustomer?.id || user?.uid || ''
    );
    setSelectedBranchId(activeBranches[0]?.id || branches[0]?.id || '');
    setAccountType('Savings');
    setInitialDeposit('0');
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleOpenAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetCustomer = isAdminView
      ? customerMap.get(selectedCustomerId)
      : currentCustomer;

    if (!targetCustomer) {
      setErrorMsg('A valid customer profile is required to open an account.');
      return;
    }
    if (!selectedBranchId) {
      setErrorMsg('Please select an active branch.');
      return;
    }

    setErrorMsg(null);
    setSubmitting(true);
    try {
      const openingAmount = isAdminView ? Number(initialDeposit) || 0 : 0;
      await openBankAccount({
        customerId: targetCustomer.id,
        uid: targetCustomer.uid,
        branchId: selectedBranchId,
        accountType,
        initialDeposit: openingAmount,
      });
      setModalOpen(false);
    } catch (err) {
      if (err instanceof BusinessValidationError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'Unable to open bank account.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (acc: BankAccount, nextStatus: AccountStatus) => {
    try {
      await adminUpdateAccount(acc.id, {
        status: nextStatus,
        branchId: acc.branchId,
        accountType: acc.accountType,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update account status.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-slate-900 tracking-tight">
            {isAdminView ? 'Bank Account Management' : 'My Bank Accounts'}
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            {isAdminView
              ? 'Open, monitor, freeze, or close simulated accounts across ACCOUNTS.'
              : 'Manage your simulated Savings, Checking, and Fixed Deposit accounts.'}
          </p>
        </div>
        <button
          type="button"
          disabled={activeBranches.length === 0 || (isAdminView && customers.length === 0)}
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Open New Account
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by account number, type, or customer..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start md:self-auto">
          {(['all', 'active', 'frozen', 'closed'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filteredAccounts.length === 0 ? (
          <div className="p-10 text-center">
            <CreditCard className="w-8 h-8 text-blue-700 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-900">No bank accounts found</p>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              {accounts.length === 0
                ? 'Open your first simulated bank account to get started.'
                : 'Try adjusting your search term or status filter.'}
            </p>
            {accounts.length === 0 && activeBranches.length > 0 && (
              <button
                type="button"
                onClick={openCreateModal}
                className="px-4 py-2 bg-blue-700 text-white text-xs font-medium rounded-lg hover:bg-blue-800"
              >
                Open Account
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4">Account Number</th>
                  {isAdminView && <th className="py-3 px-4">Customer</th>}
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Branch</th>
                  <th className="py-3 px-4 text-right">Balance</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Opened</th>
                  {isAdminView && <th className="py-3 px-4 text-right">Controls</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredAccounts.map((acc) => {
                  const cust = customerMap.get(acc.customerId);
                  const branch = branchMap.get(acc.branchId);
                  return (
                    <tr key={acc.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono text-xs font-medium text-blue-700">
                        {acc.accountNumber}
                      </td>
                      {isAdminView && (
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-900">
                            {cust?.fullName || acc.customerId}
                          </p>
                          <p className="text-xs text-slate-500 font-mono">{cust?.customerCode}</p>
                        </td>
                      )}
                      <td className="py-3 px-4 text-slate-800">{acc.accountType}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {branch ? `${branch.name} (${branch.branchCode})` : acc.branchId}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium tabular-nums text-slate-900">
                        {formatCurrency(acc.balance)}
                      </td>
                      <td className="py-3 px-4 text-xs font-medium capitalize">
                        <span
                          className={
                            acc.status === 'active'
                              ? 'text-emerald-700'
                              : acc.status === 'frozen'
                                ? 'text-amber-700'
                                : 'text-red-700'
                          }
                        >
                          {acc.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-500">
                        {formatDateOnly(acc.createdAt)}
                      </td>
                      {isAdminView && (
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            {acc.status === 'active' && (
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(acc, 'frozen')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-700 border border-amber-200 rounded-md hover:bg-amber-50 whitespace-nowrap"
                              >
                                <Lock className="w-3 h-3" />
                                Freeze
                              </button>
                            )}
                            {acc.status === 'frozen' && (
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(acc, 'active')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 border border-emerald-200 rounded-md hover:bg-emerald-50 whitespace-nowrap"
                              >
                                <Unlock className="w-3 h-3" />
                                Activate
                              </button>
                            )}
                            {acc.status !== 'closed' && (
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(acc, 'closed')}
                                className="px-2.5 py-1 text-xs font-medium text-slate-600 border border-slate-200 rounded-md hover:bg-slate-100 whitespace-nowrap"
                              >
                                Close
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Open Account Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
              <h3 className="font-display text-lg font-semibold text-slate-900">
                Open Simulated Bank Account
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleOpenAccount} className="space-y-4">
              {isAdminView && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Select Customer
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.fullName} ({c.customerCode})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Account Type
                </label>
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value as AccountType)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                >
                  <option value="Savings">Savings Account</option>
                  <option value="Checking">Checking Account</option>
                  <option value="Fixed Deposit">Fixed Deposit</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Servicing Branch
                </label>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                >
                  {activeBranches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.branchCode})
                    </option>
                  ))}
                </select>
              </div>

              {isAdminView && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Simulated Opening Deposit (USD, optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={initialDeposit}
                    onChange={(e) => setInitialDeposit(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                  />
                </div>
              )}

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-lg"
                >
                  {submitting ? 'Opening...' : 'Open Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
