import React, { useEffect, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Check,
  Copy,
  Download,
  Plus,
  Wallet,
} from 'lucide-react';
import { useBankAuth } from '../../context/BankAuthContext';
import { formatCurrency, formatDateOnly, formatTimestamp } from '../../utils/format';
import { NavTab } from '../SidebarLayout';

interface BalanceEnquiryViewProps {
  onNavigate: (tab: NavTab) => void;
}

export const BalanceEnquiryView: React.FC<BalanceEnquiryViewProps> = ({ onNavigate }) => {
  const { currentCustomer, accounts, branches, transactions, loans, dataLoading } = useBankAuth();
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedAccountId && accounts.length > 0) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  const branchMap = new Map(branches.map((b) => [b.id, b]));
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0] || null;

  const totalPortfolioBalance = accounts.reduce(
    (sum, acc) => sum + (Number(acc.balance) || 0),
    0
  );
  const activeLoans = loans.filter((l) => l.status === 'active');
  const totalLoanDebt = activeLoans.reduce(
    (sum, l) => sum + (Number(l.remainingBalance) || 0),
    0
  );

  const selectedAccountTransactions = selectedAccount
    ? transactions.filter((t) => t.accountId === selectedAccount.id)
    : [];

  const handleCopyAccountNumber = async (accountNumber: string, id: string) => {
    try {
      await navigator.clipboard.writeText(accountNumber);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // Clipboard blocked in iframe
    }
  };

  const handleDownloadBalanceReceipt = () => {
    if (!selectedAccount) return;
    const branch = branchMap.get(selectedAccount.branchId);
    const lines = [
      'BLUECREST BANK — SIMULATED BALANCE ENQUIRY STATEMENT',
      '====================================================',
      `Generated: ${new Date().toISOString()}`,
      `Customer: ${currentCustomer?.fullName || 'N/A'} (${currentCustomer?.customerCode || 'N/A'})`,
      `Account Number: ${selectedAccount.accountNumber}`,
      `Account Type: ${selectedAccount.accountType}`,
      `Account Status: ${selectedAccount.status.toUpperCase()}`,
      `Servicing Branch: ${branch ? `${branch.name} (${branch.branchCode})` : selectedAccount.branchId}`,
      `Available Balance: ${formatCurrency(selectedAccount.balance)}`,
      '',
      'Recent Transactions:',
      ...selectedAccountTransactions.slice(0, 10).map(
        (t) =>
          `${formatTimestamp(t.createdAt)} | ${t.referenceCode} | ${t.type.toUpperCase()} | ${formatCurrency(
            t.amount
          )} | Bal: ${formatCurrency(t.balanceAfter)} | ${t.description}`
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `balance-enquiry-${selectedAccount.accountNumber}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-slate-900 tracking-tight">
            Balance Enquiry & Summary
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            {currentCustomer
              ? `Welcome, ${currentCustomer.fullName} · Customer ID ${currentCustomer.customerCode} · KYC ${currentCustomer.kycStatus}`
              : 'Inspect real-time simulated account balances and recent statement activity.'}
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('teller')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            Deposit / Withdraw
          </button>
          <button
            type="button"
            onClick={() => onNavigate('accounts')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            Open Account
          </button>
        </div>
      </div>

      {/* Portfolio Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Total Liquidity Across Accounts</p>
          <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums mt-2">
            {dataLoading ? '—' : formatCurrency(totalPortfolioBalance)}
          </p>
          <p className="text-xs text-slate-500 mt-2">{accounts.length} linked bank accounts</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Active Loan Principal Remaining</p>
          <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums mt-2">
            {dataLoading ? '—' : formatCurrency(totalLoanDebt)}
          </p>
          <p className="text-xs text-slate-500 mt-2">{activeLoans.length} active loans</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Recorded Transactions</p>
          <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums mt-2">
            {dataLoading ? '—' : transactions.length}
          </p>
          <p className="text-xs text-slate-500 mt-2">Real-time Firestore ledger</p>
        </div>
      </div>

      {/* Interactive Balance Enquiry Inspector */}
      {accounts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <Wallet className="w-8 h-8 text-blue-700 mx-auto mb-3" />
          <h3 className="font-display text-lg font-semibold text-slate-900">
            No Bank Accounts Found
          </h3>
          <p className="text-sm text-slate-600 mt-1 mb-5 max-w-md mx-auto">
            Open your first simulated Savings or Checking account to inspect balances and execute
            deposits or withdrawals.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('accounts')}
            className="px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Open Simulated Account
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <label
                htmlFor="enquiry-account-select"
                className="text-xs font-medium text-slate-600 whitespace-nowrap"
              >
                Inspect Account:
              </label>
              <select
                id="enquiry-account-select"
                value={selectedAccount?.id || ''}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="px-3.5 py-2 text-sm border border-slate-200 rounded-lg bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.accountNumber} — {acc.accountType} ({formatCurrency(acc.balance)})
                  </option>
                ))}
              </select>
            </div>

            {selectedAccount && (
              <button
                type="button"
                onClick={handleDownloadBalanceReceipt}
                className="inline-flex items-center gap-2 px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 self-start lg:self-auto"
              >
                <Download className="w-3.5 h-3.5" />
                Download Balance Statement
              </button>
            )}
          </div>

          {selectedAccount && (
            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 space-y-5">
                <div>
                  <p className="text-xs font-medium text-slate-500">Available Simulated Balance</p>
                  <p className="font-mono text-4xl font-semibold text-slate-900 tabular-nums mt-1.5">
                    {formatCurrency(selectedAccount.balance)}
                  </p>
                </div>

                <dl className="space-y-3 pt-4 border-t border-slate-200 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-slate-500">Account Number</dt>
                    <dd className="flex items-center gap-2 font-mono text-slate-900">
                      <span>{selectedAccount.accountNumber}</span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyAccountNumber(selectedAccount.accountNumber, selectedAccount.id)
                        }
                        aria-label="Copy account number"
                        className="p-1 text-slate-400 hover:text-blue-700"
                      >
                        {copiedId === selectedAccount.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-700" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-slate-500">Account Type</dt>
                    <dd className="font-medium text-slate-900">{selectedAccount.accountType}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-slate-500">Status</dt>
                    <dd
                      className={`font-medium capitalize ${
                        selectedAccount.status === 'active'
                          ? 'text-emerald-700'
                          : selectedAccount.status === 'frozen'
                            ? 'text-amber-700'
                            : 'text-red-700'
                      }`}
                    >
                      {selectedAccount.status}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-slate-500">Servicing Branch</dt>
                    <dd className="text-right text-slate-900">
                      {branchMap.get(selectedAccount.branchId)?.name || selectedAccount.branchId}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-slate-500">Opened On</dt>
                    <dd className="font-mono text-xs text-slate-700">
                      {formatDateOnly(selectedAccount.createdAt)}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display text-sm font-semibold text-slate-900">
                    Recent Movements on {selectedAccount.accountNumber}
                  </h3>
                  <button
                    type="button"
                    onClick={() => onNavigate('history')}
                    className="text-xs font-medium text-blue-700 hover:underline"
                  >
                    Full History
                  </button>
                </div>

                {selectedAccountTransactions.length === 0 ? (
                  <div className="border border-slate-200 rounded-lg p-8 text-center text-sm text-slate-500">
                    No transactions recorded for this account yet. Use Deposit & Withdraw to fund
                    this account.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
                    {selectedAccountTransactions.slice(0, 6).map((tx) => {
                      const isCredit =
                        tx.type === 'deposit' ||
                        tx.type === 'transfer_in' ||
                        tx.type === 'loan_disbursement';
                      return (
                        <div
                          key={tx.id}
                          className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-slate-50/70"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {isCredit ? (
                              <ArrowDownLeft className="w-4 h-4 text-emerald-700 shrink-0" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4 text-slate-600 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">
                                {tx.description}
                              </p>
                              <p className="text-xs text-slate-500 truncate">
                                <span className="font-mono">{tx.referenceCode}</span> ·{' '}
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
                            <p className="font-mono text-xs text-slate-500 tabular-nums">
                              {formatCurrency(tx.balanceAfter)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
