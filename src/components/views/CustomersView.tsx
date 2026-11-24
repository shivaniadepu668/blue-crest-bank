import React, { useMemo, useState } from 'react';
import { Pencil, Plus, Search, UserCheck, X } from 'lucide-react';
import { useBankAuth } from '../../context/BankAuthContext';
import {
  adminCreateCustomer,
  BusinessValidationError,
  updateCustomerProfile,
} from '../../services/bankingService';
import { Customer, KycStatus } from '../../types/banking';
import { formatDateOnly } from '../../utils/format';

export const CustomersView: React.FC = () => {
  const { customers, branches, accounts, isAdmin } = useBankAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [kycFilter, setKycFilter] = useState<'all' | KycStatus>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('1994-05-12');
  const [branchId, setBranchId] = useState('');
  const [kycStatus, setKycStatus] = useState<KycStatus>('verified');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const branchMap = useMemo(() => new Map(branches.map((b) => [b.id, b])), [branches]);

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return customers.filter((c) => {
      if (kycFilter !== 'all' && c.kycStatus !== kycFilter) return false;
      if (!q) return true;
      return (
        c.fullName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.customerCode.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q)
      );
    });
  }, [customers, searchQuery, kycFilter]);

  const openCreateModal = () => {
    setEditingCustomer(null);
    setFullName('');
    setEmail('');
    setPhone('');
    setAddress('');
    setDateOfBirth('1994-05-12');
    setBranchId(branches.find((b) => b.status === 'active')?.id || branches[0]?.id || '');
    setKycStatus('verified');
    setErrorMsg(null);
    setModalOpen(true);
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setFullName(customer.fullName);
    setEmail(customer.email);
    setPhone(customer.phone);
    setAddress(customer.address);
    setDateOfBirth(customer.dateOfBirth);
    setBranchId(customer.branchId);
    setKycStatus(customer.kycStatus);
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId) {
      setErrorMsg('Please select a servicing branch.');
      return;
    }

    setErrorMsg(null);
    setSubmitting(true);
    try {
      if (editingCustomer) {
        await updateCustomerProfile(
          editingCustomer.id,
          {
            fullName,
            email,
            phone,
            address,
            dateOfBirth,
            branchId,
            kycStatus,
          },
          isAdmin
        );
      } else {
        await adminCreateCustomer({
          fullName,
          email,
          phone,
          address,
          dateOfBirth,
          branchId,
          kycStatus,
        });
      }
      setModalOpen(false);
    } catch (err) {
      if (err instanceof BusinessValidationError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'Unable to save customer.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickKyc = async (customer: Customer, status: KycStatus) => {
    try {
      await updateCustomerProfile(
        customer.id,
        {
          fullName: customer.fullName,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
          dateOfBirth: customer.dateOfBirth,
          branchId: customer.branchId,
          kycStatus: status,
        },
        true
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update KYC status.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-slate-900 tracking-tight">
            Customer Management
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Directory of registered profiles in the <span className="font-mono">CUSTOMERS</span>{' '}
            collection.
          </p>
        </div>
        <button
          type="button"
          disabled={branches.length === 0}
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Customer
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
            placeholder="Search by name, customer ID, email, or phone..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start md:self-auto">
          {(['all', 'verified', 'pending', 'suspended'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setKycFilter(status)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors whitespace-nowrap ${
                kycFilter === status
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Customer Directory Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filteredCustomers.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            {customers.length === 0
              ? 'No customers registered yet. Add a customer or have users complete onboarding.'
              : 'No customer profiles match your current search or filter.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Home Branch</th>
                  <th className="py-3 px-4 text-right">Accounts</th>
                  <th className="py-3 px-4">KYC Status</th>
                  <th className="py-3 px-4">Joined</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredCustomers.map((c) => {
                  const custAccounts = accounts.filter((a) => a.customerId === c.id);
                  const branch = branchMap.get(c.branchId);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono text-xs text-blue-700">
                        {c.customerCode}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-900">{c.fullName}</p>
                        <p className="text-xs text-slate-500">{c.email}</p>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-700">{c.phone}</td>
                      <td className="py-3 px-4 text-slate-700">
                        {branch ? `${branch.name} (${branch.branchCode})` : c.branchId}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                        {custAccounts.length}
                      </td>
                      <td className="py-3 px-4 text-xs font-medium capitalize">
                        <span
                          className={
                            c.kycStatus === 'verified'
                              ? 'text-emerald-700'
                              : c.kycStatus === 'pending'
                                ? 'text-amber-700'
                                : 'text-red-700'
                          }
                        >
                          {c.kycStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-500">
                        {formatDateOnly(c.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          {c.kycStatus !== 'verified' && (
                            <button
                              type="button"
                              onClick={() => handleQuickKyc(c, 'verified')}
                              title="Verify KYC"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 border border-emerald-200 rounded-md hover:bg-emerald-50 whitespace-nowrap"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              Verify
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openEditModal(c)}
                            aria-label={`Edit ${c.fullName}`}
                            className="p-1.5 text-slate-500 hover:text-blue-700 rounded-md hover:bg-slate-100"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
              <h3 className="font-display text-lg font-semibold text-slate-900">
                {editingCustomer ? `Edit ${editingCustomer.fullName}` : 'Register New Customer'}
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

            <form onSubmit={handleSaveCustomer} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Full Legal Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    required
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Residential Address
                </label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Home Branch
                  </label>
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.branchCode})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    KYC Status
                  </label>
                  <select
                    value={kycStatus}
                    onChange={(e) => setKycStatus(e.target.value as KycStatus)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="verified">Verified</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

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
                  {submitting ? 'Saving...' : editingCustomer ? 'Save Changes' : 'Create Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
