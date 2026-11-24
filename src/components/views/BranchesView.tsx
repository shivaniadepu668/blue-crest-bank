import React, { useMemo, useState } from 'react';
import { Landmark, MapPin, Pencil, Phone, Plus, Search, X } from 'lucide-react';
import { useBankAuth } from '../../context/BankAuthContext';
import {
  BusinessValidationError,
  createBranch,
  seedDefaultBranches,
  updateBranch,
} from '../../services/bankingService';
import { Branch, BranchStatus } from '../../types/banking';

export const BranchesView: React.FC = () => {
  const { branches, accounts, portalMode } = useBankAuth();
  const isAdminView = portalMode === 'admin';

  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [seeding, setSeeding] = useState(false);

  const [branchCode, setBranchCode] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [address, setAddress] = useState('');
  const [routingCode, setRoutingCode] = useState('');
  const [managerName, setManagerName] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<BranchStatus>('active');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const filteredBranches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return branches.filter((b) => {
      if (!q) return true;
      return (
        b.name.toLowerCase().includes(q) ||
        b.branchCode.toLowerCase().includes(q) ||
        b.city.toLowerCase().includes(q) ||
        b.routingCode.toLowerCase().includes(q)
      );
    });
  }, [branches, searchQuery]);

  const openCreateModal = () => {
    setEditingBranch(null);
    setBranchCode('BR-BOS-005');
    setName('');
    setCity('');
    setState('');
    setAddress('');
    setRoutingCode('BLCRUS33BOS');
    setManagerName('');
    setPhone('');
    setStatus('active');
    setErrorMsg(null);
    setModalOpen(true);
  };

  const openEditModal = (branch: Branch) => {
    setEditingBranch(branch);
    setBranchCode(branch.branchCode);
    setName(branch.name);
    setCity(branch.city);
    setState(branch.state);
    setAddress(branch.address);
    setRoutingCode(branch.routingCode);
    setManagerName(branch.managerName);
    setPhone(branch.phone);
    setStatus(branch.status);
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const payload = {
        branchCode,
        name,
        city,
        state,
        address,
        routingCode,
        managerName,
        phone,
        status,
      };
      if (editingBranch) {
        await updateBranch(editingBranch.id, payload);
      } else {
        await createBranch(payload);
      }
      setModalOpen(false);
    } catch (err) {
      if (err instanceof BusinessValidationError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'Unable to save branch.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSeedBranches = async () => {
    setSeeding(true);
    try {
      await seedDefaultBranches();
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-slate-900 tracking-tight">
            {isAdminView ? 'Branch Management' : 'Bank Branches Directory'}
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Servicing locations and routing codes stored in <span className="font-mono">BRANCHES</span>.
          </p>
        </div>

        {isAdminView && (
          <div className="flex items-center gap-2.5 shrink-0">
            {branches.length === 0 && (
              <button
                type="button"
                disabled={seeding}
                onClick={handleSeedBranches}
                className="px-3.5 py-2.5 border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
              >
                {seeding ? 'Seeding...' : 'Seed 4 Standard Branches'}
              </button>
            )}
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Add Branch
            </button>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search branches by name, city, branch code, or routing code..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
          />
        </div>
      </div>

      {/* Branches Grid */}
      {filteredBranches.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <Landmark className="w-8 h-8 text-blue-700 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-900">No branches found</p>
          <p className="text-xs text-slate-500 mt-1">
            {isAdminView
              ? 'Add a new branch or seed the 4 standard branches above.'
              : 'No branches match your search query.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredBranches.map((b) => {
            const linkedAccountCount = accounts.filter((a) => a.branchId === b.id).length;
            return (
              <article
                key={b.id}
                className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <span className="font-mono font-medium text-blue-700">{b.branchCode}</span>
                        <span>·</span>
                        <span
                          className={
                            b.status === 'active'
                              ? 'font-medium text-emerald-700'
                              : 'font-medium text-slate-500'
                          }
                        >
                          {b.status === 'active' ? 'Active' : 'Closed'}
                        </span>
                      </div>
                      <h3 className="font-display text-lg font-semibold text-slate-900">
                        {b.name}
                      </h3>
                    </div>
                    {isAdminView && (
                      <button
                        type="button"
                        onClick={() => openEditModal(b)}
                        aria-label={`Edit ${b.name}`}
                        className="p-1.5 text-slate-400 hover:text-blue-700 rounded-md hover:bg-slate-100"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-slate-600">
                    <p className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <span>{b.address}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="font-mono text-xs">{b.phone}</span>
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                  <span>
                    Manager: <strong className="font-medium text-slate-800">{b.managerName}</strong>
                  </span>
                  <span>
                    Routing: <strong className="font-mono text-slate-800">{b.routingCode}</strong>
                    {isAdminView && ` · ${linkedAccountCount} accounts`}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Add / Edit Branch Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
              <h3 className="font-display text-lg font-semibold text-slate-900">
                {editingBranch ? `Edit ${editingBranch.name}` : 'Create Bank Branch'}
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

            <form onSubmit={handleSaveBranch} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Branch Code
                  </label>
                  <input
                    type="text"
                    required
                    value={branchCode}
                    onChange={(e) => setBranchCode(e.target.value.toUpperCase())}
                    placeholder="BR-BOS-005"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Routing / SWIFT Code
                  </label>
                  <input
                    type="text"
                    required
                    value={routingCode}
                    onChange={(e) => setRoutingCode(e.target.value.toUpperCase())}
                    placeholder="BLCRUS33BOS"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Branch Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Boston Back Bay Center"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Manager Name
                  </label>
                  <input
                    type="text"
                    required
                    value={managerName}
                    onChange={(e) => setManagerName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as BranchStatus)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="closed">Closed</option>
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
                  {submitting ? 'Saving...' : editingBranch ? 'Save Branch' : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
