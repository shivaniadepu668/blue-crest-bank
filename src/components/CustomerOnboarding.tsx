import React, { useState } from 'react';
import { Building2, CheckCircle2, LogOut, UserPlus } from 'lucide-react';
import { useBankAuth } from '../context/BankAuthContext';
import {
  BusinessValidationError,
  openBankAccount,
  registerCustomerSelf,
} from '../services/bankingService';
import { AccountType } from '../types/banking';

export const CustomerOnboarding: React.FC = () => {
  const { user, branches, isAdmin, setPortalMode, logout } = useBankAuth();
  const activeBranches = branches.filter((b) => b.status === 'active');

  const [fullName, setFullName] = useState(user?.displayName || '');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('1995-01-15');
  const [branchId, setBranchId] = useState(activeBranches[0]?.id || '');
  const [accountType, setAccountType] = useState<AccountType>('Savings');
  const [openInitialAccount, setOpenInitialAccount] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const effectiveBranchId = branchId || activeBranches[0]?.id || '';

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!effectiveBranchId) {
      setErrorMsg('Please select an active bank branch.');
      return;
    }

    setErrorMsg(null);
    setSubmitting(true);
    try {
      const customerId = await registerCustomerSelf({
        uid: user.uid,
        email: user.email || '',
        fullName,
        phone,
        address,
        dateOfBirth,
        branchId: effectiveBranchId,
      });

      if (openInitialAccount) {
        await openBankAccount({
          customerId,
          uid: user.uid,
          branchId: effectiveBranchId,
          accountType,
        });
      }
    } catch (err) {
      if (err instanceof BusinessValidationError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'Unable to complete registration.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-8">
        <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
          <div className="w-8 h-8 rounded-lg bg-blue-700 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <span className="font-display text-lg font-semibold text-slate-900">
            BlueCrest Bank
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {isAdmin && (
            <button
              type="button"
              onClick={() => setPortalMode('admin')}
              className="px-3.5 py-2 text-xs font-medium text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap shrink-0"
            >
              Return to Admin Console
            </button>
          )}
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-white border border-slate-200 rounded-xl p-8">
          <div className="flex items-center gap-3 mb-2">
            <UserPlus className="w-5 h-5 text-blue-700" />
            <h1 className="font-display text-2xl font-semibold text-slate-900">
              Complete Customer Registration
            </h1>
          </div>
          <p className="text-sm text-slate-600 mb-6">
            Register your customer profile in the <span className="font-mono text-slate-800">CUSTOMERS</span>{' '}
            directory to access balance enquiries, simulated deposits, and loan applications.
          </p>

          {activeBranches.length === 0 ? (
            <div className="p-5 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-900 space-y-3">
              <p className="font-medium">No active bank branches are configured yet.</p>
              <p className="text-xs text-blue-800 leading-relaxed">
                An administrator must create or initialize at least one branch in{' '}
                <span className="font-mono">BRANCHES</span> before new customers can register.
              </p>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setPortalMode('admin')}
                  className="px-4 py-2 bg-blue-700 text-white text-xs font-medium rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap"
                >
                  Open Admin Dashboard to Initialize Branches
                </button>
              )}
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-5">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Alex Morgan"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Verified Email
                  </label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 234-5678"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    required
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Residential Address
                </label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="742 Evergreen Terrace, Apt 4B, New York, NY"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Preferred Home Branch
                  </label>
                  <select
                    value={effectiveBranchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  >
                    {activeBranches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.branchCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Initial Simulated Account
                  </label>
                  <select
                    value={accountType}
                    disabled={!openInitialAccount}
                    onChange={(e) => setAccountType(e.target.value as AccountType)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 disabled:bg-slate-50"
                  >
                    <option value="Savings">Savings Account</option>
                    <option value="Checking">Checking Account</option>
                    <option value="Fixed Deposit">Fixed Deposit</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={openInitialAccount}
                  onChange={(e) => setOpenInitialAccount(e.target.checked)}
                  className="rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                />
                <span>Automatically open my first simulated bank account upon registration</span>
              </label>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {submitting ? 'Creating Profile...' : 'Complete Registration'}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};
