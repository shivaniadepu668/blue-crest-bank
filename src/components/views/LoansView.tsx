import React, { useMemo, useState } from 'react';
import { Check, Plus, Scale, X } from 'lucide-react';
import { useBankAuth } from '../../context/BankAuthContext';
import {
  adminProcessLoan,
  applyForLoan,
  BusinessValidationError,
  repayLoan,
} from '../../services/bankingService';
import { Loan, LoanStatus, LoanType } from '../../types/banking';
import { calculateMonthlyEmi, formatCurrency, formatDateOnly } from '../../utils/format';

export const LoansView: React.FC = () => {
  const { loans, accounts, customers, currentCustomer, portalMode } = useBankAuth();
  const isAdminView = portalMode === 'admin';

  const [statusFilter, setStatusFilter] = useState<'all' | LoanStatus>('all');
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [repayModalLoan, setRepayModalLoan] = useState<Loan | null>(null);
  const [repayAmount, setRepayAmount] = useState('');

  const activeAccounts = useMemo(
    () => accounts.filter((a) => a.status === 'active'),
    [accounts]
  );
  const customerMap = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  // Loan Application Form State
  const [loanType, setLoanType] = useState<LoanType>('Personal');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [principalAmount, setPrincipalAmount] = useState('10000');
  const [interestRate, setInterestRate] = useState('7.5');
  const [termMonths, setTermMonths] = useState('24');
  const [purpose, setPurpose] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const estimatedEmi = useMemo(
    () =>
      calculateMonthlyEmi(
        Number(principalAmount) || 0,
        Number(interestRate) || 0,
        Number(termMonths) || 12
      ),
    [principalAmount, interestRate, termMonths]
  );

  const filteredLoans = useMemo(() => {
    return loans.filter((l) => statusFilter === 'all' || l.status === statusFilter);
  }, [loans, statusFilter]);

  const openApplyModal = () => {
    setSelectedAccountId(activeAccounts[0]?.id || '');
    setLoanType('Personal');
    setPrincipalAmount('10000');
    setInterestRate('7.5');
    setTermMonths('24');
    setPurpose('');
    setErrorMsg(null);
    setApplyModalOpen(true);
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const linkedAcc = accountMap.get(selectedAccountId);
    if (!linkedAcc) {
      setErrorMsg('Please select an active linked account for disbursement.');
      return;
    }

    const ownerCust = isAdminView
      ? customerMap.get(linkedAcc.customerId)
      : currentCustomer;

    if (!ownerCust) {
      setErrorMsg('Customer profile is required before applying for a loan.');
      return;
    }

    setErrorMsg(null);
    setSubmitting(true);
    try {
      await applyForLoan({
        customerId: ownerCust.id,
        uid: ownerCust.uid,
        accountId: linkedAcc.id,
        branchId: linkedAcc.branchId,
        loanType,
        principalAmount: Number(principalAmount),
        interestRate: Number(interestRate),
        termMonths: Number(termMonths),
        purpose,
      });
      setApplyModalOpen(false);
    } catch (err) {
      if (err instanceof BusinessValidationError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'Unable to submit loan application.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminDecision = async (loanId: string, decision: 'approve' | 'reject') => {
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await adminProcessLoan(loanId, decision);
    } catch (err) {
      if (err instanceof BusinessValidationError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'Could not process loan decision.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRepaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repayModalLoan) return;
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await repayLoan(repayModalLoan.id, Number(repayAmount));
      setRepayModalLoan(null);
      setRepayAmount('');
    } catch (err) {
      if (err instanceof BusinessValidationError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'Loan repayment failed.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-slate-900 tracking-tight">
            {isAdminView ? 'Loan Portfolio & Underwriting' : 'Loans & Simulated Repayments'}
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            {isAdminView
              ? 'Review pending applications, disburse approved loans atomically, and monitor repayments.'
              : 'Calculate estimated monthly installments, apply for simulated credit, and repay balances.'}
          </p>
        </div>

        <button
          type="button"
          disabled={activeAccounts.length === 0}
          onClick={openApplyModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Apply for Loan
        </button>
      </div>

      {errorMsg && !applyModalOpen && !repayModalLoan && (
        <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
          {errorMsg}
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg w-fit">
        {(['all', 'pending', 'active', 'paid', 'rejected'] as const).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md capitalize transition-colors whitespace-nowrap ${
              statusFilter === status
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Loans Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filteredLoans.length === 0 ? (
          <div className="p-10 text-center">
            <Scale className="w-8 h-8 text-blue-700 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-900">No loan records found</p>
            <p className="text-xs text-slate-500 mt-1">
              {loans.length === 0
                ? 'Submit a simulated loan application to get started.'
                : 'No loans match the selected status filter.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4">Loan ID</th>
                  {isAdminView && <th className="py-3 px-4">Customer</th>}
                  <th className="py-3 px-4">Product & Linked Acct</th>
                  <th className="py-3 px-4 text-right">Principal</th>
                  <th className="py-3 px-4 text-right">Rate / Term</th>
                  <th className="py-3 px-4 text-right">Monthly EMI</th>
                  <th className="py-3 px-4 text-right">Remaining</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredLoans.map((loan) => {
                  const cust = customerMap.get(loan.customerId);
                  const acc = accountMap.get(loan.accountId);
                  return (
                    <tr key={loan.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <p className="font-mono text-xs font-medium text-blue-700">
                          {loan.loanCode}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {formatDateOnly(loan.createdAt)}
                        </p>
                      </td>
                      {isAdminView && (
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-900">
                            {cust?.fullName || loan.customerId}
                          </p>
                          <p className="text-xs text-slate-500 truncate max-w-[180px]">
                            {loan.purpose}
                          </p>
                        </td>
                      )}
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-900">{loan.loanType} Loan</p>
                        <p className="font-mono text-xs text-slate-500">
                          {acc?.accountNumber || loan.accountId}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900">
                        {formatCurrency(loan.principalAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs tabular-nums text-slate-600">
                        {loan.interestRate}% · {loan.termMonths}m
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                        {formatCurrency(loan.monthlyEmi)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium tabular-nums text-slate-900">
                        {formatCurrency(loan.remainingBalance)}
                      </td>
                      <td className="py-3 px-4 text-xs font-medium capitalize">
                        <span
                          className={
                            loan.status === 'active'
                              ? 'text-blue-700'
                              : loan.status === 'paid'
                                ? 'text-emerald-700'
                                : loan.status === 'pending'
                                  ? 'text-amber-700'
                                  : 'text-red-700'
                          }
                        >
                          {loan.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isAdminView && loan.status === 'pending' && (
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              disabled={submitting}
                              onClick={() => handleAdminDecision(loan.id, 'approve')}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium rounded-md whitespace-nowrap"
                            >
                              <Check className="w-3 h-3" />
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={submitting}
                              onClick={() => handleAdminDecision(loan.id, 'reject')}
                              className="inline-flex items-center gap-1 px-2.5 py-1 border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-medium rounded-md whitespace-nowrap"
                            >
                              <X className="w-3 h-3" />
                              Reject
                            </button>
                          </div>
                        )}
                        {loan.status === 'active' && (
                          <button
                            type="button"
                            onClick={() => {
                              setRepayModalLoan(loan);
                              setRepayAmount(
                                String(Math.min(loan.monthlyEmi, loan.remainingBalance))
                              );
                              setErrorMsg(null);
                            }}
                            className="px-3 py-1.5 border border-blue-200 text-blue-700 hover:bg-blue-50 text-xs font-medium rounded-md whitespace-nowrap"
                          >
                            Make Payment
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Apply for Loan Modal */}
      {applyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
              <h3 className="font-display text-lg font-semibold text-slate-900">
                Simulated Loan Application
              </h3>
              <button
                type="button"
                onClick={() => setApplyModalOpen(false)}
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

            <form onSubmit={handleApplySubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Loan Product
                  </label>
                  <select
                    value={loanType}
                    onChange={(e) => setLoanType(e.target.value as LoanType)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="Personal">Personal Loan</option>
                    <option value="Home">Home Mortgage</option>
                    <option value="Auto">Auto Finance</option>
                    <option value="Business">Business Expansion</option>
                    <option value="Education">Education Loan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Linked Disbursement Account
                  </label>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                  >
                    {activeAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.accountNumber} ({acc.accountType})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Principal (USD)
                  </label>
                  <input
                    type="number"
                    required
                    min="100"
                    max="10000000"
                    step="100"
                    value={principalAmount}
                    onChange={(e) => setPrincipalAmount(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Annual Rate (%)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="35"
                    step="0.1"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Term (Months)
                  </label>
                  <input
                    type="number"
                    required
                    min="3"
                    max="360"
                    value={termMonths}
                    onChange={(e) => setTermMonths(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Loan Purpose
                </label>
                <input
                  type="text"
                  required
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Home renovation or equipment financing"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>

              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">
                  Estimated Monthly EMI
                </span>
                <span className="font-mono text-lg font-semibold text-blue-700 tabular-nums">
                  {formatCurrency(estimatedEmi)} / mo
                </span>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setApplyModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-lg"
                >
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Loan Repayment Modal */}
      {repayModalLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
              <h3 className="font-display text-lg font-semibold text-slate-900">
                Repay Loan {repayModalLoan.loanCode}
              </h3>
              <button
                type="button"
                onClick={() => setRepayModalLoan(null)}
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

            <form onSubmit={handleRepaySubmit} className="space-y-4">
              <div className="text-xs text-slate-600 space-y-1.5 bg-slate-50 border border-slate-200 rounded-lg p-3.5">
                <div className="flex justify-between">
                  <span>Remaining Principal</span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {formatCurrency(repayModalLoan.remainingBalance)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Linked Account Balance</span>
                  <span className="font-mono text-slate-900 tabular-nums">
                    {formatCurrency(accountMap.get(repayModalLoan.accountId)?.balance || 0)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Repayment Amount (USD)
                </label>
                <input
                  type="number"
                  required
                  min="0.01"
                  max={repayModalLoan.remainingBalance}
                  step="0.01"
                  value={repayAmount}
                  onChange={(e) => setRepayAmount(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRepayModalLoan(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-lg"
                >
                  {submitting ? 'Processing...' : 'Confirm Repayment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
