import React, { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Building,
  Check,
  CreditCard,
  Landmark,
  Scale,
  Users,
  X,
} from 'lucide-react';
import { useBankAuth } from '../../context/BankAuthContext';
import {
  adminProcessLoan,
  BusinessValidationError,
  seedDefaultBranches,
} from '../../services/bankingService';
import { formatCurrency, formatTimestamp } from '../../utils/format';
import { NavTab } from '../SidebarLayout';

interface AdminDashboardViewProps {
  onNavigate: (tab: NavTab) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ onNavigate }) => {
  const { branches, customers, accounts, transactions, loans, dataLoading } = useBankAuth();
  const [seeding, setSeeding] = useState(false);
  const [processingLoanId, setProcessingLoanId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const totalDeposits = accounts.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0);
  const activeAccountsCount = accounts.filter((a) => a.status === 'active').length;
  const verifiedCustomersCount = customers.filter((c) => c.kycStatus === 'verified').length;
  const pendingLoans = loans.filter((l) => l.status === 'pending');
  const activeLoanExposure = loans
    .filter((l) => l.status === 'active')
    .reduce((sum, l) => sum + (Number(l.remainingBalance) || 0), 0);

  const handleSeedBranches = async () => {
    setActionError(null);
    setSeeding(true);
    try {
      await seedDefaultBranches();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not initialize branches.');
    } finally {
      setSeeding(false);
    }
  };

  const handleLoanDecision = async (loanId: string, decision: 'approve' | 'reject') => {
    setActionError(null);
    setProcessingLoanId(loanId);
    try {
      await adminProcessLoan(loanId, decision);
    } catch (err) {
      if (err instanceof BusinessValidationError) {
        setActionError(err.message);
      } else {
        setActionError(err instanceof Error ? err.message : 'Loan processing failed.');
      }
    } finally {
      setProcessingLoanId(null);
    }
  };

  const customerMap = new Map(customers.map((c) => [c.id, c]));

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-slate-900 tracking-tight">
            Executive Operations Overview
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Real-time telemetry across CUSTOMERS, ACCOUNTS, BRANCHES, LOANS, and Transactions.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('customers')}
            className="px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            Manage Customers
          </button>
          <button
            type="button"
            onClick={() => onNavigate('branches')}
            className="px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            Manage Branches
          </button>
        </div>
      </div>

      {actionError && (
        <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
          {actionError}
        </div>
      )}

      {!dataLoading && branches.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-base font-semibold text-slate-900">
              Initialize Bank Branches
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              Your <span className="font-mono text-slate-800">BRANCHES</span> collection is currently
              empty. Seed 4 standard branches so customers can register and open accounts immediately.
            </p>
          </div>
          <button
            type="button"
            disabled={seeding}
            onClick={handleSeedBranches}
            className="px-4 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            {seeding ? 'Initializing...' : 'Initialize Standard Branches'}
          </button>
        </div>
      )}

      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-3">
            <span>Total Simulated Deposits</span>
            <CreditCard className="w-4 h-4 text-blue-700" />
          </div>
          <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {dataLoading ? '—' : formatCurrency(totalDeposits)}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            {activeAccountsCount} active of {accounts.length} total accounts
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-3">
            <span>Registered Customers</span>
            <Users className="w-4 h-4 text-blue-700" />
          </div>
          <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {dataLoading ? '—' : customers.length}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            {verifiedCustomersCount} KYC verified profiles
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-3">
            <span>Outstanding Loan Book</span>
            <Scale className="w-4 h-4 text-blue-700" />
          </div>
          <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {dataLoading ? '—' : formatCurrency(activeLoanExposure)}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            {pendingLoans.length} pending underwriting review
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-3">
            <span>Branch Network</span>
            <Landmark className="w-4 h-4 text-blue-700" />
          </div>
          <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {dataLoading ? '—' : branches.filter((b) => b.status === 'active').length}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            {branches.length} configured locations
          </p>
        </div>
      </div>

      {/* Two-Column Operations Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* Pending Loan Queue */}
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-semibold text-slate-900">
                Pending Loan Applications
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Approving atomically credits the linked customer account.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('loans')}
              className="text-xs font-medium text-blue-700 hover:underline whitespace-nowrap"
            >
              View All Loans
            </button>
          </div>

          {pendingLoans.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No pending loan applications awaiting review.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pendingLoans.slice(0, 5).map((loan) => {
                const cust = customerMap.get(loan.customerId);
                const busy = processingLoanId === loan.id;
                return (
                  <div
                    key={loan.id}
                    className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                        <span className="font-mono text-xs text-blue-700">{loan.loanCode}</span>
                        <span className="text-slate-300">·</span>
                        <span className="truncate">{cust?.fullName || loan.customerId}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {loan.loanType} · {loan.termMonths} mos @ {loan.interestRate}% ·{' '}
                        <span className="font-mono text-slate-800 font-medium tabular-nums">
                          {formatCurrency(loan.principalAmount)}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleLoanDecision(loan.id, 'approve')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-medium rounded-md transition-colors whitespace-nowrap"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleLoanDecision(loan.id, 'reject')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 hover:bg-slate-100 disabled:opacity-50 text-slate-700 text-xs font-medium rounded-md transition-colors whitespace-nowrap"
                      >
                        <X className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Recent Ledger Activity */}
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-semibold text-slate-900">
                Recent Bank-Wide Transactions
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Latest simulated movements recorded in Transactions.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('history')}
              className="text-xs font-medium text-blue-700 hover:underline whitespace-nowrap"
            >
              Full Ledger
            </button>
          </div>

          {transactions.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No simulated transactions have been executed yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {transactions.slice(0, 6).map((tx) => {
                const isCredit =
                  tx.type === 'deposit' ||
                  tx.type === 'transfer_in' ||
                  tx.type === 'loan_disbursement';
                return (
                  <div
                    key={tx.id}
                    className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/70"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        {isCredit ? (
                          <ArrowDownLeft className="w-4 h-4 text-emerald-700" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4 text-slate-700" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {tx.description}
                        </p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          <span className="font-mono">{tx.accountNumber}</span> ·{' '}
                          {formatTimestamp(tx.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className={`font-mono text-sm font-medium tabular-nums ${
                          isCredit ? 'text-emerald-700' : 'text-slate-900'
                        }`}
                      >
                        {isCredit ? '+' : '-'}
                        {formatCurrency(tx.amount)}
                      </p>
                      <p className="font-mono text-xs text-slate-500 tabular-nums mt-0.5">
                        Bal {formatCurrency(tx.balanceAfter)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Branch Utilization Summary */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-blue-700" />
            <h3 className="font-display text-base font-semibold text-slate-900">
              Branch Portfolio Distribution
            </h3>
          </div>
          <span className="text-xs text-slate-500">{branches.length} branches</span>
        </div>
        {branches.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Initialize branches above or add one in Branch Management.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4">Branch Code</th>
                  <th className="py-3 px-4">Branch Name</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4 text-right">Accounts</th>
                  <th className="py-3 px-4 text-right">Deposits Held</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {branches.map((branch) => {
                  const branchAccounts = accounts.filter((a) => a.branchId === branch.id);
                  const branchBalance = branchAccounts.reduce(
                    (s, a) => s + (Number(a.balance) || 0),
                    0
                  );
                  return (
                    <tr key={branch.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono text-xs text-slate-700">
                        {branch.branchCode}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">{branch.name}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {branch.city}, {branch.state}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                        {branchAccounts.length}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-slate-900">
                        {formatCurrency(branchBalance)}
                      </td>
                      <td className="py-3 px-4 text-xs font-medium">
                        <span
                          className={
                            branch.status === 'active' ? 'text-emerald-700' : 'text-slate-500'
                          }
                        >
                          {branch.status === 'active' ? 'Active' : 'Closed'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
