import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CheckCircle2,
  Download,
  Search,
} from 'lucide-react';
import { useBankAuth } from '../../context/BankAuthContext';
import {
  BusinessValidationError,
  executeInternalTransfer,
  executeSimulatedTransaction,
} from '../../services/bankingService';
import { TransactionType } from '../../types/banking';
import { formatCurrency, formatTimestamp } from '../../utils/format';

interface TransactionsDeskViewProps {
  mode: 'teller' | 'history';
}

export const TransactionsDeskView: React.FC<TransactionsDeskViewProps> = ({ mode }) => {
  const { accounts, transactions, customers, portalMode } = useBankAuth();
  const isAdminView = portalMode === 'admin';

  const activeAccounts = useMemo(
    () => accounts.filter((a) => a.status === 'active'),
    [accounts]
  );
  const customerMap = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);

  // Simulated Teller Form State
  const [operation, setOperation] = useState<'deposit' | 'withdrawal' | 'transfer'>('deposit');
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // History Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [accountFilter, setAccountFilter] = useState('all');

  useEffect(() => {
    if (!accountId && activeAccounts.length > 0) {
      setAccountId(activeAccounts[0].id);
    }
    if (!toAccountId && activeAccounts.length > 1) {
      setToAccountId(activeAccounts[1].id);
    }
  }, [activeAccounts, accountId, toAccountId]);

  const selectedSourceAccount = activeAccounts.find((a) => a.id === accountId) || null;

  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!accountId) {
      setErrorMsg('Please select an active bank account.');
      return;
    }

    const numericAmount = Number(amount);
    setSubmitting(true);
    try {
      if (operation === 'transfer') {
        const ref = await executeInternalTransfer({
          fromAccountId: accountId,
          toAccountId,
          amount: numericAmount,
          description: description || 'Internal simulated account transfer',
        });
        setSuccessMsg(`Simulated transfer completed. Reference ${ref}.`);
      } else {
        const ref = await executeSimulatedTransaction({
          accountId,
          type: operation,
          amount: numericAmount,
          description:
            description ||
            (operation === 'deposit' ? 'Simulated cash deposit' : 'Simulated cash withdrawal'),
        });
        setSuccessMsg(
          `Simulated ${operation} of ${formatCurrency(numericAmount)} completed. Reference ${ref}.`
        );
      }
      setAmount('');
      setDescription('');
    } catch (err) {
      if (err instanceof BusinessValidationError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'Transaction failed.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (accountFilter !== 'all' && tx.accountId !== accountFilter) return false;
      if (!q) return true;
      return (
        tx.referenceCode.toLowerCase().includes(q) ||
        tx.accountNumber.toLowerCase().includes(q) ||
        tx.description.toLowerCase().includes(q)
      );
    });
  }, [transactions, searchQuery, typeFilter, accountFilter]);

  const handleExportCsv = () => {
    const header = [
      'Reference',
      'Date',
      'Account Number',
      'Type',
      'Amount',
      'Balance Before',
      'Balance After',
      'Description',
      'Status',
    ];
    const rows = filteredTransactions.map((tx) => [
      tx.referenceCode,
      formatTimestamp(tx.createdAt),
      tx.accountNumber,
      tx.type,
      tx.amount.toFixed(2),
      tx.balanceBefore.toFixed(2),
      tx.balanceAfter.toFixed(2),
      `"${tx.description.replace(/"/g, '""')}"`,
      tx.status,
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bluecrest-transactions-ledger.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatTxType = (type: TransactionType) => {
    switch (type) {
      case 'deposit':
        return 'Deposit';
      case 'withdrawal':
        return 'Withdrawal';
      case 'transfer_in':
        return 'Transfer In';
      case 'transfer_out':
        return 'Transfer Out';
      case 'loan_disbursement':
        return 'Loan Disbursement';
      case 'loan_repayment':
        return 'Loan Repayment';
    }
  };

  return (
    <div className="space-y-8">
      {mode === 'teller' && (
        <section className="space-y-6">
          <div>
            <h2 className="font-display text-2xl font-semibold text-slate-900 tracking-tight">
              Simulated Deposit, Withdrawal & Transfer Desk
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Executes atomic simulated transactions updating <span className="font-mono">ACCOUNTS</span>{' '}
              and appending immutable entries to <span className="font-mono">Transactions</span>.
            </p>
          </div>

          {activeAccounts.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-600">
              No active bank accounts available. Open an active account first to perform simulated
              deposits or withdrawals.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6">
                <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg mb-6">
                  {(['deposit', 'withdrawal', 'transfer'] as const).map((op) => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => {
                        setOperation(op);
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className={`py-2 text-xs font-medium rounded-md capitalize transition-colors whitespace-nowrap ${
                        operation === op
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {op === 'transfer' ? 'Internal Transfer' : op}
                    </button>
                  ))}
                </div>

                {errorMsg && (
                  <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                    {errorMsg}
                  </div>
                )}

                {successMsg && (
                  <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}

                <form onSubmit={handleExecute} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      {operation === 'transfer' ? 'Source Account' : 'Target Account'}
                    </label>
                    <select
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white"
                    >
                      {activeAccounts.map((acc) => {
                        const cust = customerMap.get(acc.customerId);
                        return (
                          <option key={acc.id} value={acc.id}>
                            {acc.accountNumber} · {acc.accountType}
                            {isAdminView && cust ? ` (${cust.fullName})` : ''} —{' '}
                            {formatCurrency(acc.balance)}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {operation === 'transfer' && (
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        Destination Account
                      </label>
                      {activeAccounts.length < 2 ? (
                        <p className="text-xs text-amber-700 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          At least two active accounts are required for an internal transfer.
                        </p>
                      ) : (
                        <select
                          value={toAccountId}
                          onChange={(e) => setToAccountId(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white"
                        >
                          {activeAccounts.map((acc) => {
                            const cust = customerMap.get(acc.customerId);
                            return (
                              <option key={acc.id} value={acc.id}>
                                {acc.accountNumber} · {acc.accountType}
                                {isAdminView && cust ? ` (${cust.fullName})` : ''} —{' '}
                                {formatCurrency(acc.balance)}
                              </option>
                            );
                          })}
                        </select>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        Simulated Amount (USD)
                      </label>
                      <input
                        type="number"
                        required
                        min="0.01"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="250.00"
                        className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        Quick Presets
                      </label>
                      <div className="flex items-center gap-2 pt-0.5">
                        {[100, 500, 1000, 2500].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setAmount(String(preset))}
                            className="px-2.5 py-2 text-xs font-mono border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700"
                          >
                            ${preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Description / Reference Memo
                    </label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={
                        operation === 'deposit'
                          ? 'Simulated payroll deposit'
                          : operation === 'withdrawal'
                            ? 'Simulated ATM cash withdrawal'
                            : 'Savings allocation transfer'
                      }
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submitting || (operation === 'transfer' && activeAccounts.length < 2)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                    >
                      <ArrowLeftRight className="w-4 h-4" />
                      {submitting
                        ? 'Processing...'
                        : operation === 'deposit'
                          ? 'Execute Simulated Deposit'
                          : operation === 'withdrawal'
                            ? 'Execute Simulated Withdrawal'
                            : 'Execute Internal Transfer'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Account Preview Sidebar */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <h3 className="font-display text-sm font-semibold text-slate-900">
                  Selected Account Snapshot
                </h3>
                {selectedSourceAccount ? (
                  <>
                    <div>
                      <p className="text-xs text-slate-500">Current Balance</p>
                      <p className="font-mono text-3xl font-semibold text-slate-900 tabular-nums mt-1">
                        {formatCurrency(selectedSourceAccount.balance)}
                      </p>
                    </div>
                    <dl className="space-y-2.5 pt-4 border-t border-slate-100 text-xs">
                      <div className="flex justify-between">
                        <dt className="text-slate-500">Account Number</dt>
                        <dd className="font-mono text-slate-900">
                          {selectedSourceAccount.accountNumber}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-500">Product</dt>
                        <dd className="text-slate-900">{selectedSourceAccount.accountType}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-500">Projected Balance</dt>
                        <dd className="font-mono font-medium text-blue-700 tabular-nums">
                          {(() => {
                            const val = Number(amount) || 0;
                            if (operation === 'deposit') {
                              return formatCurrency(selectedSourceAccount.balance + val);
                            }
                            return formatCurrency(
                              Math.max(0, selectedSourceAccount.balance - val)
                            );
                          })()}
                        </dd>
                      </div>
                    </dl>
                  </>
                ) : null}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Transaction History Section (Shown in both modes so Teller shows live ledger below, or standalone in History) */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-slate-900 tracking-tight">
              {mode === 'history' ? 'Transaction History Ledger' : 'Recent Simulated Transactions'}
            </h2>
            <p className="text-sm text-slate-600 mt-0.5">
              Immutable ledger entries from the <span className="font-mono">Transactions</span>{' '}
              collection.
            </p>
          </div>
          {filteredTransactions.length > 0 && (
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          )}
        </div>

        {/* Ledger Filters */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reference code, account number, or memo..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-700"
            >
              <option value="all">All Accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.accountNumber} ({a.accountType})
                </option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'all' | TransactionType)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-700"
            >
              <option value="all">All Types</option>
              <option value="deposit">Deposit</option>
              <option value="withdrawal">Withdrawal</option>
              <option value="transfer_in">Transfer In</option>
              <option value="transfer_out">Transfer Out</option>
              <option value="loan_disbursement">Loan Disbursement</option>
              <option value="loan_repayment">Loan Repayment</option>
            </select>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {filteredTransactions.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              No transactions found matching your filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Account</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-right">Balance After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredTransactions.map((tx) => {
                    const isCredit =
                      tx.type === 'deposit' ||
                      tx.type === 'transfer_in' ||
                      tx.type === 'loan_disbursement';
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-mono text-xs text-slate-700">
                          {tx.referenceCode}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-500 whitespace-nowrap">
                          {formatTimestamp(tx.createdAt)}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-blue-700">
                          {tx.accountNumber}
                        </td>
                        <td className="py-3 px-4 text-xs font-medium">
                          <span className="inline-flex items-center gap-1.5 text-slate-700">
                            {isCredit ? (
                              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-700" />
                            ) : (
                              <ArrowUpRight className="w-3.5 h-3.5 text-slate-500" />
                            )}
                            {formatTxType(tx.type)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700 max-w-xs truncate">
                          {tx.description}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-mono font-medium tabular-nums whitespace-nowrap ${
                            isCredit ? 'text-emerald-700' : 'text-slate-900'
                          }`}
                        >
                          {isCredit ? '+' : '-'}
                          {formatCurrency(tx.amount)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                          {formatCurrency(tx.balanceAfter)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
